import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";

export const SECURECRT_EXECUTABLE = "/Applications/SecureCRT.app/Contents/MacOS/SecureCRT";

function expandHome(input: string): string {
    if (input === "~") return os.homedir();
    if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
    return input;
}

function resolveExecutablePath(input?: string): string {
    const executablePath = expandHome((input || SECURECRT_EXECUTABLE).trim());

    if (executablePath.endsWith(".app")) {
        return path.join(executablePath, "Contents/MacOS/SecureCRT");
    }

    return executablePath;
}

export function openSession(sessionPath: string, executablePath = SECURECRT_EXECUTABLE): Promise<void> {
    return new Promise((resolve, reject) => {
        execFile(resolveExecutablePath(executablePath), ["/T", "/S", sessionPath], (error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}
