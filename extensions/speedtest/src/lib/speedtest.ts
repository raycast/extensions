import { spawn } from "child_process";
import fs from "fs";
import { speedtestCLIFilepath } from "./cli";

export interface Result {
  isp: string | undefined;
  location: string | undefined;
  serverName: string | undefined;
  download: number | undefined;
  upload: number | undefined;
  ping: number | undefined;
  url: string | undefined;
  error: string | undefined;
}

export interface ResultProgress {
  ping: number | undefined;
  download: number | undefined;
  upload: number | undefined;
}

export function isSpeedtestCliInstalled(): boolean {
  return fs.existsSync(speedtestCLIFilepath());
}

export function runSpeedTest(
  callback: (result: Result) => void,
  resultCallback: (result: Result) => void,
  errorCallback: (error: Error) => void,
  progressCallback: (resultProgress: ResultProgress) => void,
) {
  const exePath = speedtestCLIFilepath();
  const pro = spawn(exePath, ["--format", "json", "--progress", "--accept-license", "--accept-gdpr"]);
  const result: Result = {
    isp: undefined,
    location: undefined,
    serverName: undefined,
    download: undefined,
    upload: undefined,
    ping: undefined,
    url: undefined,
    error: undefined,
  };
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

      resultCallback({
        error: errorMessage,
        isp: undefined,
        location: undefined,
        serverName: undefined,
        download: undefined,
        upload: undefined,
        ping: undefined,
        url: undefined,
      });
      console.error(`Child process exited with code ${code}`);
    }
  });

  pro.stdout.on("data", (data) => {
    try {
      const obj = JSON.parse(data);

      const t = (obj.type as string) || undefined;
      if (t) {
        if (t === "download" || t === "upload") {
          const d = obj[t];
          const bandwidth = (d.bandwidth as number) || undefined;
          result[t] = bandwidth;
          callback(result);
          sendProgress(t, (d.progress as number) || undefined);
        } else if (t === "testStart") {
          result.isp = obj.isp as string;
          result.serverName = obj.server?.name;
        } else if (t === "ping") {
          result.ping = obj.ping?.latency;
          sendProgress(t, (obj.ping?.progress as number) || undefined);
        } else if (t === "result") {
          result.download = (obj.download.bandwidth as number) || undefined;
          result.upload = (obj.upload.bandwidth as number) || undefined;
          result.ping = obj.ping?.latency;
          result.url = obj.result?.url;
          resultCallback(result);
          progressCallback({ download: undefined, upload: undefined, ping: undefined });
        }
      }
    } catch (error) {
      errorCallback(Error("Could not read data from Speedtest"));
    }
  });
}
