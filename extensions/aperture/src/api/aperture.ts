/* eslint-disable prefer-const */
import os from "os";
import { join } from "path";
import { chmodSync, unlinkSync } from "fs";
import { ExecaChildProcess, execa } from "execa";
import { environment } from "@raycast/api";
import { getTemporaryFilePath } from "~/utils/fs";
import { ApertureOptions, CropArea, RecorderCodec, VideoCodec } from "~/types/aperture";
import { getRandomString } from "~/utils/crypto";

export type Options = {
  fps?: number;
  cropArea?: CropArea;
  showCursor?: boolean;
  highlightClicks?: boolean;
  audioDeviceId?: string;
  videoCodec: VideoCodec;
  screenId: number;
};

export type RecordingResult = {
  pid: number;
  filePath: string;
  startTime: Date;
};

export class Aperture {
  private binPath: string;
  private process: ExecaChildProcess<string> | undefined;
  private recTempPath: string | undefined;
  private apertureProcessId: string | undefined;

  constructor() {
    this.binPath = join(environment.assetsPath, "aperture");
    void chmodSync(this.binPath, "755");
  }

  execAperture(...args: string[]) {
    return execa(this.binPath, args);
  }

  startRecording(options?: Options): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      (async () => {
        if (this.process != null) {
          reject(new Error("Call `.stopRecording()` first"));
          return;
        }

        const filePath = getTemporaryFilePath({ extension: "mp4" });
        this.recTempPath = filePath;
        const recorderOptions = getRecorderOptions(this.recTempPath, options);

        const timeout = setTimeout(() => {
          if (this.process === undefined) return; // stopRecording was called already

          const error = new Error("Could not start recording within 5 seconds");
          this.process.kill();
          this.process = undefined;
          reject(error);
        }, 5000);

        let isFileReadyPromise: Promise<boolean>;

        (async () => {
          try {
            await this.waitForEvent("onStart");
            const startTime = new Date();
            clearTimeout(timeout);
            if (!this.process?.pid) return reject(new Error("Recorder did not start"));
            const pid = this.process.pid;

            setTimeout(async () => {
              await isFileReadyPromise;
              resolve({ pid, filePath, startTime });
            }, 1000);
          } catch (error) {
            this.clearRecording();
            reject(error);
          }
        })();

        isFileReadyPromise = (async () => {
          await this.waitForEvent("onFileReady");
          return true;
        })();

        this.apertureProcessId = getRandomString();
        this.process = this.execAperture(
          "record",
          "--process-id",
          this.apertureProcessId,
          JSON.stringify(recorderOptions)
        );

        this.process.catch((error) => {
          if (this.recTempPath) unlinkSync(this.recTempPath);
          this.clearRecording();
          clearTimeout(timeout);
          reject(error);
        });

        if (this.process.stdout) {
          this.process.stdout.setEncoding("utf8");
          this.process.stdout.on("data", console.error);
        }
      })();
    });
  }

  async stopRecording() {
    this.throwIfNotStarted();

    if (this.process) {
      this.process.kill();
      await this.process;
      this.clearRecording();
    }
    return this.recTempPath;
  }

  clearRecording() {
    this.apertureProcessId = undefined;
    this.process = undefined;
    this.recTempPath = undefined;
  };

  async waitForEvent(name: string) {
    if (!this.apertureProcessId) return;
    await this.execAperture("events", "listen", "--process-id", this.apertureProcessId, "--exit", name);
  }

  async throwIfNotStarted() {
    if (this.process == null) {
      throw new Error("Call `.startRecording()` first");
    }
  }
}

function getRecorderOptions(tmpFilePath: string, options?: Options) {
  const {
    fps = 30,
    cropArea,
    showCursor = true,
    highlightClicks = false,
    audioDeviceId,
    videoCodec = "h264",
    screenId = 0,
  } = options ?? {};

  const recorderOptions: ApertureOptions = {
    destination: `file://${tmpFilePath}`,
    framesPerSecond: fps,
    showCursor,
    highlightClicks,
    screenId,
    audioDeviceId,
  };

  if (highlightClicks === true) {
    recorderOptions.showCursor = true;
  }

  if (
    typeof cropArea === "object" &&
    (typeof cropArea.x !== "number" ||
      typeof cropArea.y !== "number" ||
      typeof cropArea.width !== "number" ||
      typeof cropArea.height !== "number")
  ) {
    throw new Error("Invalid `cropArea` option object");
  }

  if (cropArea) {
    recorderOptions.cropRect = [
      [cropArea.x, cropArea.y],
      [cropArea.width, cropArea.height],
    ];
  }

  if (videoCodec) {
    const codecMap = new Map<string, RecorderCodec>([
      ["h264", "avc1"],
      ["hevc", "hvc1"],
      ["proRes422", "apcn"],
      ["proRes4444", "ap4h"],
    ]);

    if (!checkSupportsHevcHardwareEncoding()) {
      codecMap.delete("hevc");
    }

    if (!codecMap.has(videoCodec)) {
      throw new Error(`Unsupported video codec specified: ${videoCodec}`);
    }

    recorderOptions.videoCodec = codecMap.get(videoCodec);
  }

  return recorderOptions;
}

function checkSupportsHevcHardwareEncoding() {
  const cpuModel = os.cpus()[0].model;

  // All Apple silicon Macs support HEVC hardware encoding.
  if (cpuModel.startsWith("Apple ")) {
    // Source string example: `'Apple M1'`
    return true;
  }

  // Get the Intel Core generation, the `4` in `Intel(R) Core(TM) i7-4850HQ CPU @ 2.30GHz`
  // More info: https://www.intel.com/content/www/us/en/processors/processor-numbers.html
  // Example strings:
  // - `Intel(R) Core(TM) i9-9980HK CPU @ 2.40GHz`
  // - `Intel(R) Core(TM) i7-4850HQ CPU @ 2.30GHz`
  const result = /Intel.*Core.*i\d+-(\d)/.exec(cpuModel);

  // Intel Core generation 6 or higher supports HEVC hardware encoding
  return result && Number.parseInt(result[1], 10) >= 6;
}
