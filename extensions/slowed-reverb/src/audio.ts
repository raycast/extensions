import { constants } from "node:fs";
import { copyFile, link, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AudioOptions, resolveAudioOptions } from "./audio-options";
import { errorMessage, findSox, hasErrorCode, runSox } from "./sox";

const audioExtensions = new Set([".mp3", ".wav", ".flac", ".ogg", ".aiff", ".aif", ".m4a", ".aac", ".mp4"]);

export function hasAudioExtension(file: string) {
  return audioExtensions.has(path.extname(file).toLowerCase());
}

export function resolveInputPaths(files: string[]) {
  if (!files.length) throw new Error("Choose at least one audio file.");
  return [
    ...new Set(
      files.map((file) => {
        if (!path.isAbsolute(file)) throw new Error("Use absolute paths to local audio files.");
        return path.normalize(file);
      }),
    ),
  ];
}

async function checkAudioFile(inputPath: string) {
  if (!hasAudioExtension(inputPath)) throw new Error("Unsupported audio file extension.");
  const info = await statIfPresent(inputPath);
  if (!info?.isFile()) throw new Error("The audio file could not be found.");
}

async function statIfPresent(file: string) {
  try {
    return await stat(file);
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) return undefined;
    throw error;
  }
}

type AudioResult =
  | { status: "success"; inputPath: string; outputPath: string }
  | { status: "failure"; inputPath: string; error: string };

function needsWindowsStaging(inputPath: string) {
  // Legacy Windows SoX uses narrow filenames.
  return process.platform === "win32" && (/[^\x20-\x7e]/.test(inputPath) || inputPath.length >= 260);
}

async function stageInput(inputPath: string, directory: string) {
  const name = `input${path.extname(inputPath).toLowerCase()}`;
  const target = path.join(directory, name);
  await link(inputPath, target).catch(() => copyFile(inputPath, target));
  return name;
}

async function withWorkspace<T>(work: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(path.join(tmpdir(), "slowed-reverb-"));
  try {
    return await work(directory);
  } finally {
    await rm(directory, { recursive: true, force: true }).catch((error: unknown) => {
      console.error(`Could not remove SoX temporary files: ${errorMessage(error)}`);
    });
  }
}

async function writeOutput(
  executable: string,
  inputPath: string,
  options: ReturnType<typeof resolveAudioOptions>,
): Promise<string> {
  const directory = options.outputDirectory ?? path.dirname(inputPath);
  return withWorkspace(async (workspace) => {
    const temporaryName = `render.${options.format}`;
    const temporaryFile = path.join(workspace, temporaryName);
    const source = needsWindowsStaging(inputPath) ? await stageInput(inputPath, workspace) : inputPath;
    const encoding = options.format === "mp3" ? ["-C", "320", "-r", "44100", "-c", "2"] : ["-b", "24"];
    await runSox(
      executable,
      ["-V1", "-G", "--no-glob", source, ...encoding, temporaryName, ...options.effects],
      workspace,
    );

    const name = `${path.parse(inputPath).name}-${options.preset === "convert" ? "converted" : options.preset}`;
    for (let index = 1; ; index++) {
      const suffix = index === 1 ? "" : `-${index}`;
      const outputPath = path.join(directory, `${name}${suffix}.${options.format}`);
      try {
        await copyFile(temporaryFile, outputPath, constants.COPYFILE_EXCL);
        return outputPath;
      } catch (error) {
        if (!hasErrorCode(error, "EEXIST")) throw error;
      }
    }
  });
}

export async function processAudio(
  files: string[],
  options: AudioOptions,
  onProgress?: (current: number, total: number) => void,
): Promise<AudioResult[]> {
  const settings = resolveAudioOptions(options);
  const inputs = resolveInputPaths(files);
  if (settings.outputDirectory) {
    const directory = await statIfPresent(settings.outputDirectory);
    if (!directory?.isDirectory()) throw new Error("Choose an existing output folder.");
  }
  const executable = await findSox();

  const results: AudioResult[] = [];
  for (const [index, inputPath] of inputs.entries()) {
    onProgress?.(index + 1, inputs.length);
    try {
      await checkAudioFile(inputPath);
      const outputPath = await writeOutput(executable, inputPath, settings);
      results.push({ status: "success", inputPath, outputPath });
    } catch (error) {
      results.push({ status: "failure", inputPath, error: errorMessage(error) });
    }
  }

  return results;
}

export async function inspectAudioFile(file: string) {
  const [inputPath] = resolveInputPaths([file]);
  await checkAudioFile(inputPath);
  const executable = await findSox();
  const inspect = (source: string, cwd?: string) =>
    Promise.all(["-t", "-D", "-r", "-c"].map((flag) => runSox(executable, ["--i", flag, source], cwd)));
  const [format, duration, rate, channelCount] = needsWindowsStaging(inputPath)
    ? await withWorkspace(async (workspace) => inspect(await stageInput(inputPath, workspace), workspace))
    : await inspect(inputPath);
  const durationSeconds = Number(duration);
  return {
    inputPath,
    format,
    durationSeconds: durationSeconds > 0 ? durationSeconds : null,
    sampleRateHz: Number(rate),
    channels: Number(channelCount),
  };
}
