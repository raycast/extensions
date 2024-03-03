import React from "react";
import { environment } from "@raycast/api";

import { LoggerFn, ScriptType } from "../core";
import { runAppleScript, runPython } from "../utils";

import { useSaveRef } from "./useSaveRef";

type ScriptsPropType = string[];

type RunCommandDefaultProps = {
  sequence?: boolean;
  disabled?: boolean;
  logger?: LoggerFn;
  onError?: (err: Error) => unknown;
  onSuccess?: (stdout: string[]) => unknown;
  onComplete?: (status: boolean) => unknown;
};

export type RunASCommand = RunCommandDefaultProps & {
  type: ScriptType.applescript;
  scripts: ScriptsPropType;
};

export type RunPythonCommand = RunCommandDefaultProps & {
  type: ScriptType.python;
  scripts: ScriptsPropType;
};

export type RunCommandProps = RunASCommand | RunPythonCommand;

async function runSequence<T extends string>(commands: Array<() => Promise<T>>) {
  const results: T[] = [];
  for (const command of commands) {
    results.push(await command());
  }

  return results;
}

async function runAll<T extends string>(commands: Array<() => Promise<T>>) {
  return Promise.all(commands.map((c) => c()));
}

export const useRunCommand = (command: RunCommandProps) => {
  const { onError, onSuccess, onComplete, disabled, sequence } = command;
  const onErrorRef = useSaveRef(onError);
  const onSuccessRef = useSaveRef(onSuccess);
  const onCompeteRef = useSaveRef(onComplete);
  const scriptsCommandRef = useSaveRef(command.scripts);

  const [pending, setPending] = React.useState(false);
  const [complete, setComplete] = React.useState(false);

  const logger = React.useCallback(
    (message: string) => {
      command.logger?.(message);

      if (environment.isDevelopment) {
        console.log(message);
      }
    },
    [command.logger],
  );
  const runner = command.type === ScriptType.python ? runPython : runAppleScript;

  React.useEffect(() => {
    if (disabled) return;

    setPending(true);

    const scripts = scriptsCommandRef.current;
    const execute = sequence ? runSequence : runAll;

    execute(scripts.map((script) => runner.bind(this, script, logger)))
      .then((stdout) => {
        onSuccessRef.current?.(stdout);
        onCompeteRef.current?.(true);
      })
      .finally(() => {
        setPending(false);
        setComplete(true);
      })
      .catch((e) => {
        onErrorRef.current?.(e);
        onCompeteRef.current?.(false);
      });
  }, [disabled, onErrorRef, onSuccessRef, onCompeteRef, scriptsCommandRef, setPending, setComplete]);

  return { pending, complete };
};
