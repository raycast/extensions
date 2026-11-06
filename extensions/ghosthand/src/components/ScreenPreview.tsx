import { Action, ActionPanel, Detail, Icon, showInFinder, showToast, Toast, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useRef } from "react";
import { pathToFileURL } from "node:url";
import { useResource } from "../hooks/use-resource";
import { client } from "../lib/ghosthand-client";
import { copyScreenshot, createPreviewImage, saveScreenshot } from "../lib/screenshots";
import type { Phone } from "../lib/types";
import { ErrorView } from "./Setup";
import { ScreenTextView } from "./ScreenTextView";
import { TaskForm } from "./TaskForm";

export function ScreenPreview({ phone, allowControl = true }: { phone: Phone; allowControl?: boolean }) {
  const load = useCallback(
    async (signal: AbortSignal) => createPreviewImage(await client.preview(phone.id, signal), signal),
    [phone.id],
  );
  const { data, error, isLoading, refresh } = useResource(load);
  const exporting = useRef(false);

  async function exportImage(save: boolean) {
    if (!data || exporting.current) return;
    exporting.current = true;
    try {
      if (save) {
        const path = await saveScreenshot(data.bytes);
        await showToast({
          style: Toast.Style.Success,
          title: "Screenshot saved to Downloads",
          primaryAction: { title: "Show in Finder", onAction: () => showInFinder(path) },
        });
      } else {
        await copyScreenshot(data.bytes);
        await showToast({ style: Toast.Style.Success, title: "Screenshot copied" });
      }
    } catch (failure) {
      await showFailureToast(failure, {
        title: save ? "Could not save screenshot" : "Could not copy screenshot",
      });
    } finally {
      exporting.current = false;
    }
  }

  if (error) return <ErrorView error={error} retry={refresh} />;
  return (
    <Detail
      navigationTitle={`Screen · ${phone.name}`}
      isLoading={isLoading}
      markdown={
        data ? `![iPhone screen](${pathToFileURL(data.file).href}?raycast-height=340)` : "Loading iPhone preview…"
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="iPhone" text={phone.name} />
          <Detail.Metadata.Label title="Preview" text="Read-only · On-demand" />
          <Detail.Metadata.Label title="Control" text="No lease acquired" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Refresh Screenshot" icon={Icon.ArrowClockwise} onAction={refresh} />
          {data && (
            <>
              <Action title="Copy Screenshot" icon={Icon.Clipboard} onAction={() => exportImage(false)} />
              <Action
                title="Save Screenshot to Downloads"
                icon={Icon.Download}
                onAction={() => exportImage(true)}
                shortcut={Keyboard.Shortcut.Common.Save}
              />
            </>
          )}
          {allowControl && (
            <>
              <Action.Push
                title="Run Task"
                icon={Icon.Play}
                target={<TaskForm phoneId={phone.id} navigationTitle="Run iPhone Task" />}
              />
              <Action.Push title="Read Screen Text" icon={Icon.Text} target={<ScreenTextView phone={phone} />} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
