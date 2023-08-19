import { useEffect, useReducer, useRef } from "react";
import { environment } from "@raycast/api";
import { join } from "path";
import { chmod, writeFile } from "fs/promises";
import { ExecaChildProcess, execa } from "execa";
import os from "os";
import { writeFileSync } from "fs";

const command = join(environment.assetsPath, "aperture");

const callAperture = (...args: string[]) => {
  return execa(command, args);
};

type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type VideoCodec = "h264" | "hevc" | "proRes422" | "proRes4444";

type RecorderCoded = "avc1" | "hvc1" | "apcn" | "ap4h";

type Options = {
  fps?: number;
  cropArea?: CropArea;
  showCursor?: boolean;
  highlightClicks?: boolean;
  audioDeviceId?: string;
  videoCodec: VideoCodec;
  screenId: number;
};

type ApertureOptions = {
  destination?: string;
  framesPerSecond?: number;
  showCursor?: boolean;
  highlightClicks?: boolean;
  audioDeviceId?: string;
  videoCodec?: RecorderCoded;
  screenId?: number;
  cropRect?: [number, number][];
};

const getRandomId = () => Math.random().toString(36).slice(2, 15);

export function useAperture() {
  const processId = useRef<string>();
  const isInitializedRef = useRef(false);
  const recorder = useRef<ExecaChildProcess<string>>();
  const tmpPath = useRef<string>();
  const isFileReady = useRef<Promise<string>>();

  useEffect(() => {
    const init = async () => {
      if (!isInitializedRef.current) {
        await chmod(command, "755");
        isInitializedRef.current = true;
      }
    };

    void init();
  });

  const startRecording = async (options?: Options) => {
    processId.current = getRandomId();
    
    return new Promise((resolve, reject) => {
      const {
        fps = 30,
        cropArea,
        showCursor = true,
        highlightClicks = false,
        audioDeviceId,
        videoCodec = "h264",
        screenId = 0,
      } = options ?? {};
  
  
      if (recorder.current != null) {
        reject(new Error('Call `.stopRecording()` first'));
				return;
      }
  
      tmpPath.current = join(os.tmpdir(), `${getRandomId()}.mp4`);
      writeFileSync(tmpPath.current, 'Sample MP4 file content.');
  
      const recorderOptions: ApertureOptions = {
        destination: `file://${tmpPath.current}`,
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
        const codecMap = new Map<string, RecorderCoded>([
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
  
      const timeout = setTimeout(() => {
        // `.stopRecording()` was called already
        if (recorder.current === undefined) {
          return;
        }
  
        const error = new Error('Could not start recording within 5 seconds');
				error.code = 'RECORDER_TIMEOUT';
        recorder.kill();
        recorder.current = undefined;
        reject(error);
      }, 5000);
  
      (async () => {
        try {
          await waitForEvent('onStart');
          clearTimeout(timeout);
          setTimeout(resolve, 1000);
        } catch (error) {
          reject(error);
        }
      })();
  
      isFileReady.current = (async () => {
        await waitForEvent("onFileReady");
        return tmpPath.current!;
      })();
  
      recorder.current = callAperture("record", "--process-id", processId.current!, JSON.stringify(recorderOptions));

      recorder.current.catch((error) => {
        clearTimeout(timeout);
        recorder.current = undefined;
        reject(error);
      });
  
      if (recorder.current.stdout) {
        recorder.current.stdout.setEncoding("utf8");
        recorder.current.stdout.on("data", console.error);
      }
    })
  };

  async function waitForEvent(name: string) {
    if (!processId.current) return;
    const {stdout} = await callAperture("events", "listen", "--process-id", processId.current, "--exit", name);
  }

  async function throwIfNotStarted() {
    if (recorder.current === undefined) {
      throw new Error("Call `.startRecording()` first");
    }
  }

  async function stopRecording() {
    throwIfNotStarted();

    if (recorder.current) {
      recorder.current.kill();
      await recorder.current;
      recorder.current = undefined;
      isFileReady.current = undefined;
    }
    return tmpPath.current!;
  }

  return {
    startRecording,
    stopRecording,
  };
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
