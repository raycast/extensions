import { exec } from "child_process";
import { promisify } from "util";

import { getExtensionConfig } from "@/utils";

const execAsync = promisify(exec);

// https://developers.weixin.qq.com/miniprogram/dev/devtools/cli.html
type SubCommand = "open" | "preview" | "login" | "islogin";

export async function runWechatDevtool(
  subCommand: SubCommand,
  subCommandArgs: string[] = [],
): Promise<{ stdout: string; stderr: string }> {
  const { cliPath } = await getExtensionConfig();
  return await execCommand(cliPath, [subCommand, ...subCommandArgs]);
}

async function execCommand(cliPath: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    const command = buildCommand(cliPath, args);
    const { stdout, stderr } = await execAsync(command);
    return { stdout: stdout || "", stderr: stderr || "" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || error.message || "",
    };
  }
}

function buildCommand(cliPath: string, args: string[]): string {
  const quotedCliPath = JSON.stringify(cliPath);
  const quotedArgs = args.map((arg) => JSON.stringify(arg)).join(" ");
  return `${quotedCliPath} ${quotedArgs}`;
}
