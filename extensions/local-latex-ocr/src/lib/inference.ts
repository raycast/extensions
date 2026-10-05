import path from "node:path";
import { createRequire } from "node:module";
import { readFile, stat } from "node:fs/promises";
import * as wasmOrt from "onnxruntime-web/wasm";
import { getReviewReasons, isKatexValid, postProcessLatex } from "./latex";
import { loadPng, prepareTexTellerInput } from "./preprocess";
import { LatexTokenizer } from "./tokenizer";
import type { OcrResult } from "../types";

const BOS_TOKEN = 2;
const EOS_TOKEN = 2;
// TexTeller3 normally finishes well below this. Keeping a hard cap prevents a
// malformed/unfinished decode from turning into an unbounded hotkey action.
const MAX_SEQUENCE_LENGTH = 128;
const REPEATED_TOKEN_LIMIT = 12;
const TEX_TELLER_LAYERS = 12;
const COREML_CREATE_MLPROGRAM_FLAG = 0x010;
const COREML_USE_CPU_AND_GPU_FLAG = 0x020;

export type InferenceBackend = "auto" | "coreml" | "cpu" | "wasm";
type OrtRuntime = Pick<typeof wasmOrt, "InferenceSession" | "Tensor">;

export interface InferenceEngineLike {
  readonly backend: Exclude<InferenceBackend, "auto">;
  recognize(imagePath: string): Promise<OcrResult>;
}

let runtimeDirectory = "";
let preferredBackend: InferenceBackend = "auto";

export function configureOnnxRuntime(
  directory: string,
  options?: { backend?: InferenceBackend; threads?: number },
): void {
  runtimeDirectory = directory;
  preferredBackend = options?.backend ?? parseBackend(process.env.LOCAL_LATEX_OCR_BACKEND);
  const requestedThreads = Number(process.env.LOCAL_LATEX_OCR_THREADS ?? "1");
  const threads = options?.threads ?? requestedThreads;
  wasmOrt.env.wasm.numThreads = Number.isFinite(threads) ? Math.max(1, Math.min(8, Math.floor(threads))) : 1;
  wasmOrt.env.wasm.proxy = false;
  wasmOrt.env.wasm.wasmPaths = `${directory}${path.sep}`;
}

/** TexTeller3-only engine. */
export class InferenceEngine {
  private constructor(private readonly engine: TexTellerEngine) {}

  static async create(modelDirectory: string): Promise<InferenceEngineLike> {
    if (!(await isTexTellerModel(modelDirectory))) {
      throw new Error("TexTeller3 model files are missing. Download the verified TexTeller3 model before capturing.");
    }
    return new InferenceEngine(await TexTellerEngine.create(modelDirectory));
  }

  get backend(): Exclude<InferenceBackend, "auto"> {
    return this.engine.backend;
  }

  recognize(imagePath: string): Promise<OcrResult> {
    return this.engine.recognize(imagePath);
  }
}

/** TexTeller3 ViT encoder + TrOCR decoder with one-token KV-cache decoding. */
class TexTellerEngine implements InferenceEngineLike {
  private readonly firstTokenBuffer = new BigInt64Array([BigInt(BOS_TOKEN)]);
  private readonly nextTokenBuffer = new BigInt64Array([0n]);
  private readonly firstTokenTensor: wasmOrt.Tensor;
  private readonly nextTokenTensor: wasmOrt.Tensor;
  private readonly cacheInputs: Array<{ input: string; present: string }>;

  private constructor(
    private readonly runtime: OrtRuntime,
    private readonly encoder: wasmOrt.InferenceSession,
    private readonly decoder: wasmOrt.InferenceSession,
    private readonly decoderWithPast: wasmOrt.InferenceSession,
    private readonly tokenizer: LatexTokenizer,
    readonly backend: Exclude<InferenceBackend, "auto">,
  ) {
    // Reuse these objects on every request and every decode step. Allocating
    // 20-40 short-lived tensors per formula was a measurable source of jitter.
    this.firstTokenTensor = new runtime.Tensor("int64", this.firstTokenBuffer, [1, 1]);
    this.nextTokenTensor = new runtime.Tensor("int64", this.nextTokenBuffer, [1, 1]);
    this.cacheInputs = this.decoderWithPast.inputNames.slice(1).map((input) => ({
      input,
      present: input.replace("past_key_values.", "present."),
    }));
    if (this.cacheInputs.length !== TEX_TELLER_LAYERS * 4) {
      throw new Error(`Unexpected TexTeller3 decoder cache layout (${this.cacheInputs.length} tensors).`);
    }
  }

  static async create(modelDirectory: string): Promise<TexTellerEngine> {
    const failures: string[] = [];
    for (const backend of backendCandidates(preferredBackend)) {
      try {
        return await this.createForBackend(modelDirectory, backend);
      } catch (error) {
        failures.push(`${backend}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    throw new Error(`No local TexTeller inference backend could start. ${failures.join(" | ")}`);
  }

  private static async createForBackend(
    modelDirectory: string,
    backend: Exclude<InferenceBackend, "auto">,
  ): Promise<TexTellerEngine> {
    const runtime = loadRuntime(backend);
    const executionProviders: wasmOrt.InferenceSession.ExecutionProviderConfig[] =
      backend === "coreml"
        ? [
            {
              name: "coreml",
              // MLProgram + CPU/GPU lets Core ML take supported encoder
              // partitions while CPU handles q4f16-only decoder operators.
              coreMlFlags: COREML_CREATE_MLPROGRAM_FLAG | COREML_USE_CPU_AND_GPU_FLAG,
            },
            "cpu",
          ]
        : [backend];
    const options: wasmOrt.InferenceSession.SessionOptions = {
      executionProviders,
      graphOptimizationLevel: "all",
      executionMode: "sequential",
      ...nativeSessionTuning(backend),
    };
    const sessions: wasmOrt.InferenceSession[] = [];
    try {
      const createSession = async (name: string) => {
        const session = await runtime.InferenceSession.create(
          await readFile(resolveTexTellerFile(modelDirectory, name)),
          options,
        );
        sessions.push(session);
        return session;
      };
      const encoder = await createSession("encoder_model_q4f16.onnx");
      const decoder = await createSession("decoder_model_q4f16.onnx");
      const decoderWithPast = await createSession("decoder_with_past_model_q4f16.onnx");
      const tokenizer = await LatexTokenizer.fromFile(path.join(modelDirectory, "tokenizer.json"));
      return new TexTellerEngine(runtime, encoder, decoder, decoderWithPast, tokenizer, backend);
    } catch (error) {
      await Promise.allSettled(sessions.map((session) => session.release()));
      throw error;
    }
  }

  async recognize(imagePath: string): Promise<OcrResult> {
    const startedAt = performance.now();
    const inputData = prepareTexTellerInput(await loadPng(imagePath));
    const imageTensor = new this.runtime.Tensor("float32", inputData.data, inputData.dimensions);
    const encoderOutputs = await this.encoder.run({
      [this.encoder.inputNames[0]]: imageTensor,
    });
    imageTensor.dispose();
    const hidden = encoderOutputs[this.encoder.outputNames[0]];
    disposeOutputs(encoderOutputs, this.encoder.outputNames[0]);

    const tokens: number[] = [];
    const probabilities: number[] = [];
    let eosReached = false;
    let repeatedToken = -1;
    let repeatedTokenCount = 0;
    let past = new Map<string, wasmOrt.Tensor>();
    let logits: wasmOrt.Tensor | undefined;

    try {
      const firstOutputs = await this.decoder.run({
        [this.decoder.inputNames[0]]: this.firstTokenTensor,
        [this.decoder.inputNames[1]]: hidden,
      });
      hidden.dispose();
      logits = firstOutputs[this.decoder.outputNames[0]];
      for (const name of this.decoder.outputNames.slice(1)) {
        const value = firstOutputs[name];
        if (value) past.set(name, value);
      }
      disposeOutputs(firstOutputs, this.decoder.outputNames[0], this.decoder.outputNames.slice(1));

      for (let step = 0; step < MAX_SEQUENCE_LENGTH; step += 1) {
        if (!logits) throw new Error("TexTeller3 decoder returned no logits.");
        const vocabularySize = Number(logits.dims.at(-1));
        const logitsData = logits.data as Float32Array;
        const offset = logitsData.length - vocabularySize;
        const nextToken = argmax(logitsData, offset, vocabularySize);
        probabilities.push(maxSoftmaxProbability(logitsData, offset, vocabularySize));
        tokens.push(nextToken);
        logits.dispose();
        logits = undefined;
        if (nextToken === EOS_TOKEN) {
          eosReached = true;
          break;
        }
        if (nextToken === repeatedToken) repeatedTokenCount += 1;
        else {
          repeatedToken = nextToken;
          repeatedTokenCount = 1;
        }
        // A bad crop can make the decoder loop on one token until the hard
        // limit. Stop early and route it to review instead of wasting seconds.
        if (repeatedTokenCount >= REPEATED_TOKEN_LIMIT) break;

        this.nextTokenBuffer[0] = BigInt(nextToken);
        const feeds: Record<string, wasmOrt.Tensor> = {
          [this.decoderWithPast.inputNames[0]]: this.nextTokenTensor,
        };
        for (const binding of this.cacheInputs) {
          const value = past.get(binding.present);
          if (!value) throw new Error(`TexTeller3 decoder cache is missing ${binding.present}.`);
          feeds[binding.input] = value;
        }
        const nextOutputs = await this.decoderWithPast.run(feeds);
        const nextPast = new Map<string, wasmOrt.Tensor>();
        for (const name of this.decoderWithPast.outputNames.slice(1)) {
          const value = nextOutputs[name];
          if (value) nextPast.set(name, value);
        }
        for (const [name, value] of past) {
          // Cross-attention K/V is constant and is deliberately reused.
          if (name.includes(".encoder.")) nextPast.set(name, value);
          else value.dispose();
        }
        past = nextPast;
        logits = nextOutputs[this.decoderWithPast.outputNames[0]];
        disposeOutputs(nextOutputs, this.decoderWithPast.outputNames[0], this.decoderWithPast.outputNames.slice(1));
      }
    } finally {
      logits?.dispose();
      for (const value of past.values()) value.dispose();
    }

    const latex = postProcessLatex(this.tokenizer.decode(tokens));
    const meanTokenProbability = probabilities.length
      ? probabilities.reduce((sum, probability) => sum + probability, 0) / probabilities.length
      : 0;
    const minimumTokenProbability = probabilities.length ? Math.min(...probabilities) : 0;
    const reviewReasons = getReviewReasons({
      latex,
      meanTokenProbability,
      minimumTokenProbability,
      eosReached,
      tokenCount: tokens.length,
      maxTokenCount: MAX_SEQUENCE_LENGTH,
    });
    return {
      latex,
      tokenCount: tokens.length,
      meanTokenProbability,
      minimumTokenProbability,
      eosReached,
      syntaxValid: isKatexValid(latex),
      elapsedMs: performance.now() - startedAt,
      backend: this.backend,
      reviewReasons,
    };
  }
}

function disposeOutputs(
  outputs: Record<string, wasmOrt.Tensor>,
  keepName: string,
  transferredNames: readonly string[] = [],
): void {
  const transferred = new Set(transferredNames);
  for (const [name, tensor] of Object.entries(outputs)) {
    if (name !== keepName && !transferred.has(name)) tensor.dispose();
  }
}

async function isTexTellerModel(directory: string): Promise<boolean> {
  try {
    await Promise.all(
      ["encoder_model_q4f16.onnx", "decoder_model_q4f16.onnx", "decoder_with_past_model_q4f16.onnx"].map((name) =>
        stat(resolveTexTellerFile(directory, name)),
      ),
    );
    await stat(path.join(directory, "tokenizer.json"));
    return true;
  } catch {
    return false;
  }
}

function resolveTexTellerFile(directory: string, name: string): string {
  return path.join(directory, "onnx", name);
}

function nativeSessionTuning(
  backend: Exclude<InferenceBackend, "auto">,
): Partial<wasmOrt.InferenceSession.SessionOptions> {
  if (backend === "wasm") return {};
  const appleSiliconCpu = backend === "cpu" && process.platform === "darwin" && process.arch === "arm64";
  // TexTeller's encoder/decoder are compute-heavy. Apple Silicon scales well
  // to the performance cores; users can override this for thermals/battery.
  const threadCount = Number(process.env.LOCAL_LATEX_OCR_NATIVE_THREADS ?? (appleSiliconCpu ? "6" : "0"));
  const arenaSetting = process.env.LOCAL_LATEX_OCR_CPU_ARENA ?? (appleSiliconCpu ? "1" : undefined);
  return {
    interOpNumThreads: 1,
    ...(Number.isFinite(threadCount) && threadCount > 0
      ? { intraOpNumThreads: Math.min(12, Math.floor(threadCount)) }
      : {}),
    ...(arenaSetting === "0"
      ? { enableCpuMemArena: false, enableMemPattern: false }
      : arenaSetting === "1"
        ? { enableCpuMemArena: true, enableMemPattern: true }
        : {}),
  };
}

function loadRuntime(backend: Exclude<InferenceBackend, "auto">): OrtRuntime {
  if (backend === "wasm") return wasmOrt;
  if (!runtimeDirectory) throw new Error("Runtime directory is not configured");
  const runtimeRequire = createRequire(path.join(runtimeDirectory, "worker.cjs"));
  return runtimeRequire("onnxruntime-node") as OrtRuntime;
}

export function backendCandidates(
  backend: InferenceBackend,
  platform = process.platform,
  architecture = process.arch,
): Exclude<InferenceBackend, "auto">[] {
  if (backend !== "auto") return backend === "coreml" ? ["coreml", "cpu", "wasm"] : [backend];
  return platform === "darwin" && architecture === "arm64" ? ["cpu", "coreml", "wasm"] : ["wasm"];
}

function parseBackend(value: string | undefined): InferenceBackend {
  return value === "coreml" || value === "cpu" || value === "wasm" ? value : "auto";
}

function argmax(values: ArrayLike<number>, offset = 0, length = values.length): number {
  let bestIndex = 0;
  let bestValue = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < length; index += 1) {
    const value = values[offset + index];
    if (value > bestValue) {
      bestValue = value;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function maxSoftmaxProbability(values: ArrayLike<number>, offset: number, length: number): number {
  let maximum = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < length; index += 1) maximum = Math.max(maximum, values[offset + index]);
  let denominator = 0;
  for (let index = 0; index < length; index += 1) denominator += Math.exp(values[offset + index] - maximum);
  return denominator === 0 ? 0 : 1 / denominator;
}
