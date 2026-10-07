import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { apiGet, errorMessage } from "./api";
import type { DictationStatusResponse } from "./types";
import { stopDictation } from "./workflow-dictation";

const POLL_INTERVAL_MS = 2000;

/** Polls the dictation state while the view is open. */
export function useDictationStatus() {
  const { data, error, revalidate } = usePromise(
    () => apiGet<DictationStatusResponse>("/v1/dictation/status"),
    [],
    // The lists show their own errors; a failing status check stays quiet.
    { onError: () => {} },
  );

  // Stop polling after a failure instead of retrying every 2 seconds.
  useEffect(() => {
    if (error) {
      return;
    }
    const timer = setInterval(revalidate, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [error, revalidate]);

  return { status: error ? undefined : data, revalidate };
}

/** Shown at the top of a list while a dictation is recording. */
export function RunningDictationSection(props: {
  status: DictationStatusResponse | undefined;
}) {
  if (!props.status?.is_recording) {
    return null;
  }

  async function stop() {
    try {
      await stopDictation();
    } catch (error) {
      await showFailureToast(errorMessage(error, "Failed to stop dictation"), {
        title: "TypeWhisper",
      });
    }
  }

  return (
    <List.Section title="Recording">
      <List.Item
        title="Stop Dictation"
        subtitle={props.status.active_workflow ?? undefined}
        icon={{ source: Icon.Stop, tintColor: Color.Red }}
        actions={
          <ActionPanel>
            <Action title="Stop Dictation" icon={Icon.Stop} onAction={stop} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
