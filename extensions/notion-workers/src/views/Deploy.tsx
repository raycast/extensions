import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { streamDeploy, type StreamHandle, type Worker } from "../lib/ntn";

export default function DeployView({
  worker,
  location,
}: {
  worker: Worker;
  location: string;
}) {
  const [output, setOutput] = useState("");
  const [exitCode, setExitCode] = useState<number | null | undefined>(
    undefined,
  );
  const [isRunning, setIsRunning] = useState(true);
  const handleRef = useRef<StreamHandle | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOutput("");
    setExitCode(undefined);
    setIsRunning(true);
    const handle = streamDeploy(location, {
      onChunk: (chunk) => {
        if (cancelled) return;
        setOutput((prev) => prev + chunk);
      },
      onClose: (code) => {
        if (cancelled) return;
        setExitCode(code);
        setIsRunning(false);
      },
      onError: (err) => {
        if (cancelled) return;
        setOutput((prev) => prev + `\n[error] ${err.message}\n`);
        setIsRunning(false);
      },
    });
    handleRef.current = handle;
    return () => {
      cancelled = true;
      handle.cancel();
    };
  }, [location]);

  useEffect(() => {
    if (isRunning) return;
    const title = exitCode === 0 ? "Deploy succeeded" : "Deploy failed";
    const style = exitCode === 0 ? Toast.Style.Success : Toast.Style.Failure;
    showToast({ style, title, message: worker.name });
  }, [isRunning, exitCode, worker.name]);

  const statusLine = isRunning
    ? "_Deploying…_"
    : exitCode === 0
      ? "_Deploy succeeded._"
      : `_Deploy failed (exit ${exitCode ?? "?"})._`;

  const markdown =
    `### Deploying ${worker.name}\n` +
    `\`${location}\`\n\n` +
    (output ? "```\n" + output + "\n```" : "_Waiting for output…_") +
    `\n\n${statusLine}`;

  return (
    <Detail
      isLoading={isRunning}
      navigationTitle={`Deploy · ${worker.name}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Output" content={output} />
          {isRunning ? (
            <Action
              title="Cancel Deploy"
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              onAction={() => handleRef.current?.cancel()}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
