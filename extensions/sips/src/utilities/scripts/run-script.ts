import { execSync, spawn } from "child_process";

export type ScriptOptions = Partial<{
  language: "AppleScript" | "JXA";
  command: string;
  stderrCallback: (data: string) => void;
  timeout: number;
  leadingArgs: (string | boolean | number)[];
  trailingArgs: (string | boolean | number)[];
  logDebugMessages: boolean;
  logErrors: boolean;
  logFinalOutput: boolean;
  logIntermediateOutput: boolean;
  logSentMessages: boolean;
}>;

/**
 * Executes an OSA script using the `osascript` command.
 * @param script The script to execute (either a path to a file or the script itself)
 * @param trailingArgs The arguments to pass to the script
 * @param language The language of the script, defaults to AppleScript
 * @returns A promise that resolves to the output of the script.
 */
export function runScript<T>(
  script: string,
  options?: ScriptOptions,
): { data: Promise<T | string>; sendMessage: (msg: string) => void } {
  let command = options?.command;
  const language = options?.language;
  const scriptArgs = [...(options?.leadingArgs?.map((x) => x.toString()) || [])];
  const trailingArgs = options?.trailingArgs || [];
  if (!command && (language === undefined || language === "AppleScript" || language === "JXA")) {
    command = "/usr/bin/osascript";
    scriptArgs.push(
      "-l",
      language === "JXA" ? "JavaScript" : "AppleScript",
      ...(script.startsWith("/") ? [] : ["-e"]),
      script,
      ...trailingArgs.map((x) => x.toString()),
    );
  }

  const env = process.env;
  if (options?.command) {
    env.PATH = `${env.PATH}:${execSync(`$(/bin/bash -lc 'echo $SHELL') -lc 'echo "$PATH"'`).toString()}`;
    command = options.command;
    scriptArgs.push(script, ...trailingArgs.map((x) => x.toString()));
  }

  if (!command) {
    throw new Error("No command specified.");
  }

  let data = "";
  let sendMessage: (msg: string) => void = (msg: string) => {
    console.log(msg);
  };

  const proc = spawn(command, scriptArgs, { env });

  if (options?.logDebugMessages) console.log(`Running shell command "${command} ${scriptArgs.join(" ")}"`);

  proc.stdout?.on("data", (chunk) => {
    data += chunk.toString();
    if (options?.logIntermediateOutput) console.log(`Data from script: ${data}`);
  });

  proc.stderr?.on("data", (chunk) => {
    if (options?.stderrCallback) {
      options.stderrCallback(chunk.toString());
    }
    if (options?.logErrors) console.error(chunk.toString());
  });

  proc.stdin.on("error", (err) => {
    if (options?.logErrors) console.error(`Error writing to stdin: ${err}`);
  });

  sendMessage = async (message: string) => {
    if (message?.length > 0) {
      proc.stdin.cork();
      proc.stdin.write(`${message}\r\n`);
      process.nextTick(() => proc.stdin.uncork());
      if (options?.logSentMessages) console.log(`Sent message: ${message}`);
    }
  };

  const waitForFinish = async (): Promise<T | string> =>
    new Promise((resolve, reject) => {
      const timeout = options?.timeout
        ? setTimeout(() => {
            try {
              proc.kill();
            } catch (error) {
              if (options?.logErrors) console.error(`Error killing process: ${error}`);
            }
            if (options?.logErrors) console.error("Script timed out");
            proc.stdin.end();
            proc.kill();
            return reject("Script timed out");
          }, options?.timeout)
        : undefined;

      proc.on("close", (code) => {
        if (code !== 0) {
          if (options?.logErrors) console.error(`Script exited with code ${code}`);
          proc.stdin.end();
          proc.kill();
          return reject(`Script exited with code ${code}`);
        }
        clearTimeout(timeout);

        let result: T | string;
        try {
          result = JSON.parse(data) as T;
        } catch {
          result = data.trim();
        }
        if (options?.logFinalOutput) console.log(`Script output: ${result}`);
        return resolve(result);
      });
    });

  return { data: waitForFinish(), sendMessage: sendMessage };
}

export function runAppleScript<T>(
  script: string,
  options?: ScriptOptions,
): { data: Promise<T | string>; sendMessage: (msg: string) => void } {
  return runScript(script, { ...options, language: "AppleScript" });
}

export function runJXA<T>(
  script: string,
  options?: ScriptOptions,
): { data: Promise<T | string>; sendMessage: (msg: string) => void } {
  return runScript(script, { ...options, language: "JXA" });
}
