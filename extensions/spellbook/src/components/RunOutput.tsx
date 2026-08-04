import { useEffect, useRef, useState } from "react";

import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";

import { getShellEnv, killInline, spawnInline } from "../lib/exec";

const MAX_OUTPUT_CHARS = 100_000;

interface RunOutputProps {
  title: string;
  command: string;
  cwd: string;
}

function statusText(isRunning: boolean, exitCode: number | undefined): string {
  if (isRunning) {
    return "Running…";
  }
  return exitCode === undefined ? "Terminated" : `Exited ${exitCode}`;
}

export default function RunOutput(props: RunOutputProps) {
  const { title, command, cwd } = props;

  const [output, setOutput] = useState("");
  const [exitCode, setExitCode] = useState<number | undefined>(undefined);
  const [isRunning, setIsRunning] = useState(true);
  const [runId, setRunId] = useState(0);
  const childRef = useRef<ReturnType<typeof spawnInline> | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    setOutput("");
    setExitCode(undefined);
    setIsRunning(true);

    const append = (chunk: Buffer) => {
      if (cancelled) {
        return;
      }
      setOutput((previous) => {
        const next = previous + chunk.toString();
        return next.length > MAX_OUTPUT_CHARS
          ? next.slice(next.length - MAX_OUTPUT_CHARS)
          : next;
      });
    };

    void getShellEnv().then((env) => {
      if (cancelled) {
        return;
      }
      const child = spawnInline(command, env, cwd);
      childRef.current = child;
      child.stdout.on("data", append);
      child.stderr.on("data", append);
      child.on("error", (error) => {
        if (cancelled) {
          return;
        }
        setOutput((previous) => `${previous}\n${String(error)}`);
        setIsRunning(false);
      });
      child.on("close", (code) => {
        if (cancelled) {
          return;
        }
        setExitCode(code ?? undefined);
        setIsRunning(false);
      });
    });

    return () => {
      cancelled = true;
      killInline(childRef.current);
      childRef.current = undefined;
    };
  }, [command, cwd, runId]);

  const markdown = ["````", `$ ${command}`, output, "````"].join("\n");

  return (
    <Detail
      navigationTitle={title}
      isLoading={isRunning}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={statusText(isRunning, exitCode)}
          />
          <Detail.Metadata.Label title="Directory" text={cwd} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Output" content={output} />
          <Action.CopyToClipboard
            title="Copy Command"
            content={command}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action
            title="Run Again"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => setRunId((previous) => previous + 1)}
          />
          <Action
            title="Stop"
            icon={Icon.Stop}
            shortcut={{ modifiers: ["ctrl"], key: "c" }}
            onAction={() => killInline(childRef.current)}
          />
        </ActionPanel>
      }
    />
  );
}
