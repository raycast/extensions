import fs from 'fs';
import { spawn } from "child_process";
import { fstat } from "fs";

export interface Result {
    isp: string | undefined;
    location: string | undefined;
    serverName: string | undefined;
    download: number | undefined;
    upload: number | undefined;
    ping: number | undefined;
}

const exePath = "/usr/local/bin/speedtest";

export function isSpeedtestCliInstalled(): boolean {
    return fs.existsSync(exePath);
}


export function runSpeedTest(callback: (result: Result) => void, resultCallback: (result: Result) => void, errorCallback: (error: Error) => void) {
    const pro = spawn(exePath, ["--format", "json", "--progress"]);
    let result: Result = { isp: undefined, location: undefined, serverName: undefined, download: undefined, upload: undefined, ping: undefined };

    pro.on('uncaughtException', function (err) {
        errorCallback(err);
    });

    pro.on('error', function (err) {
        errorCallback(err);
    });

    pro.stdout.on("data", (data) => {
        const obj = JSON.parse(data);
        const t = obj.type as string || undefined;
        if (t) {
            if (t === "download" || t === "upload") {
                const d = obj[t];
                const bandwidth = d.bandwidth as number || undefined;
                result[t] = bandwidth;
                callback(result);
            } else if (t === "testStart") {
                result.isp = obj.isp as string;
                result.serverName = obj.server?.name;
            } else if (t === "ping") {
                result.ping = obj.ping?.latency;
            } else if (t === "result") {
                result.download = obj.download.bandwidth as number || undefined;
                result.upload = obj.upload.bandwidth as number || undefined;
                result.ping = obj.ping?.latency;
                resultCallback(result);
            }
        }
    });

}
