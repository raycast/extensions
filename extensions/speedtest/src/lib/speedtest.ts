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

export function isSpeedtestCliInstalled(): boolean {
  return fs.existsSync(speedtestCLIFilepath());
}

export function runSpeedTest(
  partialUpdateCallback: (result: SpeedtestResult) => void,
  resultCallback: (result: SpeedtestResult) => void,
  errorCallback: (error: Error) => void,
  progressCallback: (resultProgress: ResultProgress) => void,
) {
  const exePath = speedtestCLIFilepath();
  const pro = spawn(exePath, ["--format", "json", "--progress", "--accept-license", "--accept-gdpr"]);
  const result: SpeedtestResult = { ...SpeedtestResultDefaultValue };
  const resultProgress: ResultProgress = { download: undefined, upload: undefined, ping: undefined };

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
    errorCallback(err instanceof Error ? err : new Error("unknown error"));
  });

  pro.on("error", function (err) {
    errorCallback(err);
  });

  let stderrOutput = "";

  pro.stderr.on("data", (data) => {
    stderrOutput += data.toString();
  });

  pro.on("exit", (code) => {
    if (code === 0) {
      console.log("Child process completed successfully.");
    } else {
      console.log("Stderr output:", stderrOutput);

      const errorMessage = stderrOutput.includes("NoNetworkConnection")
        ? "The Internet connection appears to be offline."
        : "Something went wrong. Please try again.";

      resultCallback({ ...SpeedtestResultDefaultValue, error: errorMessage });
      console.error(`Child process exited with code ${code}`);
    }
  });

  pro.stdout.on("data", (data: string) => {
    try {
      const speedtestEventData = JSON.parse(data) as SpeedtestResultResponse;
      const { type } = speedtestEventData;

      if (type) {
        if (type === "download" || type === "upload") {
          const speed = speedtestEventData[type];
          result[type] = speed;

          sendProgress(type, speed.progress);
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
    } catch (error) {
      errorCallback(Error("Could not read data from Speedtest"));
    }
  });
}
