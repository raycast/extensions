import { environment, getPreferenceValues } from "@raycast/api";
import { execSync, spawn } from "child_process";
import { join } from "path";
import { ModelToEnvVars, OpenInterpreterPreferences, assertUnreachable } from "./types";
import { Subject } from "rxjs";
import { writeFileSync } from "fs";
import { log } from "console";

export interface Language {
  language: string;
}

export interface CodeChunk {
  code?: string;
}

export interface LanguageChunk {
  language: string;
}

export interface ExecutingChunk {
  executing: {
    code: string;
    language: string;
  };
}

export interface ActiveLineChunk {
  active_line: number;
}

export interface OutputChunk {
  output: string;
}

export interface EndOfExecutionChunk {
  end_of_execution: boolean;
}

export interface MessageChunk {
  message: string;
}

export interface FinishedChunk {
  finished: boolean;
}

export interface FullMessagesChunk {
  messages: string;
}

export interface StartOfMessageChunk {
  start_of_message: boolean;
}

export interface EndOfExecutionChunk {
  end_of_message: boolean;
}

export interface StartofCodeChunk {
  start_of_code: boolean;
}

export interface EndOfCodeChunk {
  end_of_code: boolean;
}

type ResponseChunk =
  | LanguageChunk
  | CodeChunk
  | ExecutingChunk
  | ActiveLineChunk
  | OutputChunk
  | EndOfExecutionChunk
  | MessageChunk
  | FinishedChunk
  | FullMessagesChunk
  | StartOfMessageChunk
  | EndOfExecutionChunk
  | StartofCodeChunk
  | EndOfCodeChunk;

export function isLanguageChunk(chunk: ResponseChunk): chunk is LanguageChunk {
  return (chunk as LanguageChunk).language !== undefined;
}

export function isCodeChunk(chunk: ResponseChunk): chunk is CodeChunk {
  return (chunk as CodeChunk).code !== undefined;
}

export function isExecutingChunk(chunk: ResponseChunk): chunk is ExecutingChunk {
  return (chunk as ExecutingChunk).executing !== undefined;
}

export function isActiveLineChunk(chunk: ResponseChunk): chunk is ActiveLineChunk {
  return (chunk as ActiveLineChunk).active_line !== undefined;
}

export function isOutputChunk(chunk: ResponseChunk): chunk is OutputChunk {
  return (chunk as OutputChunk).output !== undefined;
}

export function isEndOfExecutionChunk(chunk: ResponseChunk): chunk is EndOfExecutionChunk {
  return (chunk as EndOfExecutionChunk).end_of_execution !== undefined;
}

export function isMessageChunk(chunk: ResponseChunk): chunk is MessageChunk {
  return (chunk as MessageChunk).message !== undefined;
}

export function isFinishedChunk(chunk: ResponseChunk): chunk is FinishedChunk {
  return (chunk as FinishedChunk).finished !== undefined;
}

export function isFullMessagesChunk(chunk: ResponseChunk): chunk is FullMessagesChunk {
  return (chunk as FullMessagesChunk).messages !== undefined;
}

export function isStartOfMessageChunk(chunk: ResponseChunk): chunk is StartOfMessageChunk {
  return (chunk as StartOfMessageChunk).start_of_message !== undefined;
}

export function isEndOfMessageChunk(chunk: ResponseChunk): chunk is EndOfExecutionChunk {
  return (chunk as EndOfExecutionChunk).end_of_message !== undefined;
}

export function isStartofCodeChunk(chunk: ResponseChunk): chunk is StartofCodeChunk {
  return (chunk as StartofCodeChunk).start_of_code !== undefined;
}

export function isEndOfCodeChunk(chunk: ResponseChunk): chunk is EndOfCodeChunk {
  return (chunk as EndOfCodeChunk).end_of_code !== undefined;
}

export interface ContextItem {
  role: string;
  message: string;
  language?: string;
  code?: string;
  output?: string;
}

export function isContextItem(item: unknown): item is ContextItem {
  return (item as ContextItem).role !== undefined;
}

export class StreamParser {
  private content = "";
  private activeLine: number | null = null;
  private currentLanguage = "";
  private current_code = "";
  private current_output: string | undefined = undefined;
  private responseContentHook: (content: string) => void;
  private loadingHook: (loading: boolean) => void;
  private fullMessageHook: (message: string) => void;

  // Constructor that takes a hook to call with updated content
  constructor(
    responseContentHoook?: (content: string) => void,
    loadingHook?: (loading: boolean) => void,
    fullMessageHook?: (message: string) => void
  ) {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.responseContentHook = responseContentHoook ?? (() => {});
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.loadingHook = loadingHook ?? (() => {});
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.fullMessageHook = fullMessageHook ?? (() => {});
  }

  build_context(jsonString: string) {
    const contextArray = JSON.parse(jsonString);

    contextArray.forEach((contextItem: unknown) => {
      if (!isContextItem(contextItem)) throw new Error("Context item is not a context item");

      if (contextItem.role === "user") {
        this.user_question(contextItem.message);
      } else if (contextItem.role === "assistant") {
        if (contextItem.message) {
          this.update({ message: contextItem.message } as MessageChunk);
        }
        if (contextItem.language) {
          this.update({ language: contextItem.language } as LanguageChunk);
        }
        if (contextItem.code) {
          this.update({ code: contextItem.code } as CodeChunk);
        }
        if (contextItem.output) {
          this.update({ output: contextItem.output } as OutputChunk);
        }
      }
    });
  }

  user_question(question: string) {
    if (this.content !== "") {
      this.content += "\n * * * \n";
    }

    this.content += `You asked: **${question}**\n\n`;

    this.content += "\n * * * \n";

    this.responseContentHook(this.getContent());
  }

  update(chunk: ResponseChunk) {
    console.log(chunk);
    if (isLanguageChunk(chunk)) {
      this.currentLanguage = chunk.language;
    } else if (isCodeChunk(chunk)) {
      this.current_code += chunk.code;
    } else if (isExecutingChunk(chunk)) {
      // this.current_code = chunk.executing.code;
    } else if (isActiveLineChunk(chunk)) {
      this.activeLine = chunk.active_line;
    } else if (isOutputChunk(chunk)) {
      if (this.current_output === undefined) {
        this.current_output = "";
      }
      this.current_output += chunk.output;
    } else if (isEndOfExecutionChunk(chunk)) {
      // We clean everything up in the output line;
      this.content += `*Result:* \n\`\`\`\n${ensure_newline(this.current_output)}\`\`\`\n\n`;
      this.current_output = undefined;
    } else if (isMessageChunk(chunk)) {
      this.content += `${chunk.message}`;
    } else if (isFinishedChunk(chunk)) {
      void 0;
    } else if (isFullMessagesChunk(chunk)) {
      this.fullMessageHook(chunk.messages);
    } else if (isStartOfMessageChunk(chunk)) {
      this.loadingHook(true);
    } else if (isEndOfMessageChunk(chunk)) {
      this.loadingHook(false);
    } else if (isStartofCodeChunk(chunk)) {
      this.current_code = "";
    } else if (isEndOfCodeChunk(chunk)) {
      this.content += `\n\n\`\`\`${this.currentLanguage}\n${ensure_newline(this.current_code)}\`\`\`\n\n`;
      this.current_code = "";
    } else {
      // If anything in this line is showing a typeerror, it's because we forgot to add a type guard
      return assertUnreachable(chunk);
    }

    this.responseContentHook(this.getContent());
  }

  getContent() {
    let output = this.content;

    if (this.current_code !== "") {
      if (this.activeLine !== null) {
        const lines = this.current_code.split("\n");
        lines[this.activeLine - 1] = `**${lines[this.activeLine - 1]}**`;
        output += `\n\`\`\`${this.currentLanguage}\n${lines.join("\n")}\n\`\`\``;
      } else {
        output += `\n\`\`\`${this.currentLanguage}\n${ensure_newline(this.current_code)}\`\`\``;
      }
    }

    if (this.current_output !== undefined) {
      output += `\n*Result:* \n\`\`\`\n${ensure_newline(this.current_output)}\`\`\`\n`;
    }

    return output;
  }
}

function ensure_newline(message: string | undefined): string {
  if (message === undefined) {
    return "\n";
  }

  if (message.endsWith("\n")) {
    return message;
  }
  return message + "\n";
}

function generate_rc_file() {
  const rcfile_path = join(environment.assetsPath, ".bashrc");

  const rcfile_content = `#!/usr/bin/env bash
which python
`;
  log(rcfile_path);
  writeFileSync(rcfile_path, rcfile_content);
}

export function ConverseWithInterpretrer(): [(input: string) => void, Subject<string>, () => void] {
  const pythonCommandPath = join(environment.assetsPath, "main");
  generate_rc_file();

  const preferences = getPreferenceValues<OpenInterpreterPreferences>();

  const env = ModelToEnvVars(
    preferences["openinterpreter-model"],
    preferences["openinterpreter-api-key"],
    preferences["openinterpreter-base-url"]
  );

  if (preferences["openinterpreter-budget"] !== undefined) {
    env["MAX_BUDGET"] = preferences["openinterpreter-budget"].toString();
  }

  env["PYTHONEXECUTABLE"] = "python3";
  env["HOME"] = process.env.HOME || "";
  // env["DEBUG_MODE"] = "True";

  console.log(env);

  execSync(`chmod +x "${pythonCommandPath}"`);

  const python_interpreter = spawn("bash", ["-c", `"${pythonCommandPath}"`], {
    env,
    stdio: "pipe",
    shell: true,
    cwd: environment.assetsPath,
  });

  python_interpreter.stdout.setEncoding("utf8");
  python_interpreter.stderr.setEncoding("utf8");

  const output$ = new Subject<string>();

  python_interpreter.stdout.on("data", (chunk) => {
    output$.next(chunk.toString());
  });

  python_interpreter.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  python_interpreter.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
  });

  const sendInput = (input: string) => {
    python_interpreter.stdin.write(input + "\n");
  };

  const kill_fn = () => {
    console.log("Killing python interpreter");
    python_interpreter.kill();
  };

  return [sendInput, output$, kill_fn];
}
