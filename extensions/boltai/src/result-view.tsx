import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactNode, useRef, useState } from "react";
import { BoltError, showBoltFailure } from "./bolt";

/** Runs one bolt request and shows its text, with paste and copy actions. Leaving the view cancels it. */
export function ResultView(props: {
  navigationTitle: string;
  /** `onProgress` receives Multi-step Workflow steps ("Step 2 of 3 · Polish") while it runs. */
  run: (signal: AbortSignal, onProgress: (text: string) => void) => Promise<string>;
  actions?: ReactNode;
}) {
  const abortable = useRef<AbortController>(null);
  const [progress, setProgress] = useState<string>();
  const { isLoading, data, error, revalidate } = usePromise(
    async (run: typeof props.run) => {
      setProgress(undefined);
      return run(abortable.current!.signal, setProgress);
    },
    [props.run],
    { abortable, onError: showBoltFailure },
  );

  const markdown = error
    ? `**${error instanceof BoltError ? error.title : "BoltAI failed"}**\n\n${error.message}`
    : isLoading && progress
      ? `_${progress}…_`
      : (data ?? "");

  return (
    <Detail
      navigationTitle={props.navigationTitle}
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {data !== undefined && !isLoading ? (
            <>
              <Action.Paste content={data} />
              <Action.CopyToClipboard content={data} />
            </>
          ) : null}
          {props.actions}
          <Action
            title="Run Again"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
