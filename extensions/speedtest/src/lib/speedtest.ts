import { spawn } from "child_process";
import fs from "fs";
import { speedtestCLIFilepath } from "./cli";
import { ResultProgress, SpeedtestResult, SpeedtestResultResponse } from "./speedtest.types";

export const SpeedtestResultDefaultValue: SpeedtestResult = {
  isp: "",
  packetLoss: 0,
  download: {
    bandwidth: 0,
    bytes: 0,
    elapsed: 0,
    latency: {
      jitter: 0,
      high: 0,
      low: 0,
      iqm: 0,
    },
  },
  upload: {
    bandwidth: 0,
    bytes: 0,
    elapsed: 0,
    latency: {
      jitter: 0,
      high: 0,
      low: 0,
      iqm: 0,
    },
  },
  interface: {
    isp: "",
    externalIp: "",
    internalIp: "",
    isVpn: false,
    macAddr: "",
    name: "",
  },
  ping: {
    high: 0,
    jitter: 0,
    latency: 0,
    low: 0,
    packetLoss: 0,
  },
  server: {
    country: "",
    host: "",
    id: 0,
    ip: "",
    location: "",
    name: "",
    port: 0,
  },
  result: {
    id: "",
    persisted: false,
    url: "",
  },
};

export type SpeedtestResultType = "download" | "upload" | "ping" | "testStart";
export type SpeedtestStdoutResult = SpeedtestResult & { type: SpeedtestResultType };
export type SpeedSampleCallback = (type: "download" | "upload", bandwidth: number) => void;

/** Turn the CLI's stderr into something the user can act on. */
export function describeCliFailure(stderr: string, code: number | null): string {
  if (stderr.includes("NoNetworkConnection")) {
    return "The Internet connection appears to be offline.";
  }
  if (/Too many requests|Limit reached/i.test(stderr)) {
    return "Speedtest rate limit reached. Ookla blocks frequent tests from the same network, wait a few minutes before running it again.";
  }
  // The CLI logs lines like "[2026-09-02 21:11:53.387] [error] Configuration - client error (UnknownException)".
  const firstError = stderr
    .split(/\r?\n/)
    .map((line) => line.replace(/^\[[^\]]*\]\s*\[error\]\s*/, "").trim())
    .find((line) => line.length > 0);
  return firstError
    ? `Speedtest failed: ${firstError}`
    : `Something went wrong (speedtest exited with code ${code ?? "unknown"}). Please try again.`;
}

export function isSpeedtestCliInstalled(): boolean {
  return fs.existsSync(speedtestCLIFilepath());
}

export type SpeedtestHandle = {
  /** Kill the CLI and silence every callback. Safe to call more than once. */
  cancel: () => void;
};

export function runSpeedTest(
  partialUpdateCallback: (result: SpeedtestResult) => void,
  resultCallback: (result: SpeedtestResult) => void,
  errorCallback: (error: Error) => void,
  progressCallback: (resultProgress: ResultProgress) => void,
  sampleCallback?: SpeedSampleCallback,
): SpeedtestHandle {
  const exePath = speedtestCLIFilepath();
  const pro = spawn(exePath, ["--format", "json", "--progress", "--accept-license", "--accept-gdpr"]);
  const result: SpeedtestResult = { ...SpeedtestResultDefaultValue };
  const resultProgress: ResultProgress = { download: undefined, upload: undefined, ping: undefined };
  let cancelled = false;

  const sendProgress = (type: string, val: number | undefined) => {
    if (val) {
      switch (type) {
        case "download":
          {
            resultProgress.download = val;
          }
          break;
        case "upload":
          {
            resultProgress.upload = val;
          }
          break;
        case "ping": {
          resultProgress.ping = val;
        }
      }
      progressCallback(resultProgress);
    }
  };

  pro.on("uncaughtException", function (err) {
    if (cancelled) return;
    errorCallback(err instanceof Error ? err : new Error("unknown error"));
  });

  pro.on("error", function (err) {
    if (cancelled) return;
    errorCallback(err);
  });

  let stderrOutput = "";

  pro.stderr.on("data", (data) => {
    stderrOutput += data.toString();
  });

  pro.on("exit", (code) => {
    if (cancelled) return;
    if (code === 0) {
      console.log("Child process completed successfully.");
    } else {
      console.log("Stderr output:", stderrOutput);

      resultCallback({ ...SpeedtestResultDefaultValue, error: describeCliFailure(stderrOutput, code) });
      console.error(`Child process exited with code ${code}`);
    }
  });

  const handleSpeedtestEvent = (speedtestEventData: SpeedtestResultResponse) => {
    const { type } = speedtestEventData;

    if (type && !cancelled) {
      if (type === "download" || type === "upload") {
        const speed = speedtestEventData[type];
        result[type] = speed;

        sendProgress(type, speed.progress);
        if (speed.bandwidth) {
          sampleCallback?.(type, speed.bandwidth);
        }
        partialUpdateCallback(result);
      } else if (type === "testStart") {
        result.interface = {
          isp: speedtestEventData.isp,
          ...speedtestEventData.interface,
        };
        result.isp = speedtestEventData.isp;
        result.server = speedtestEventData.server;

        partialUpdateCallback(result);
      } else if (type === "ping") {
        result.ping = speedtestEventData.ping;

        partialUpdateCallback(result);
        sendProgress(type, speedtestEventData.ping.progress);
      } else if (type === "result") {
        result.ping = speedtestEventData.ping;
        result.download = speedtestEventData.download;
        result.upload = speedtestEventData.upload;
        result.interface = {
          isp: speedtestEventData.isp,
          ...speedtestEventData.interface,
        };

        result.result = speedtestEventData.result;

        resultCallback(result);
        progressCallback({ download: undefined, upload: undefined, ping: undefined });
      }
    }
  };

  let stdoutBuffer = "";

  pro.stdout.on("data", (data: Buffer) => {
    stdoutBuffer += data.toString();
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      try {
        handleSpeedtestEvent(JSON.parse(line) as SpeedtestResultResponse);
      } catch {
        if (!cancelled) errorCallback(Error("Could not read data from Speedtest"));
        return;
      }
    }
  });

  pro.stdout.on("end", () => {
    const line = stdoutBuffer.trim();
    if (!line) {
      return;
    }

    try {
      handleSpeedtestEvent(JSON.parse(line) as SpeedtestResultResponse);
    } catch {
      if (!cancelled) errorCallback(Error("Could not read data from Speedtest"));
    }
  });

  return {
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      if (pro.exitCode === null && !pro.killed) {
        pro.kill();
      }
    },
  };
}
