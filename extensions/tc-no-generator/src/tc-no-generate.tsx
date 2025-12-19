import React from "react";
import { Detail, ActionPanel, Action, LocalStorage, Toast, showToast, Clipboard, Keyboard } from "@raycast/api";
import { generator } from "./lib/generator";

export default function Command(): React.JSX.Element {
  const no = generator();

  React.useEffect(() => {
    // Auto-save generated TC as last and append to history
    (async () => {
      try {
        await LocalStorage.setItem("last-generate-tc", no);
        const raw = await LocalStorage.getItem<string>("tc-history");
        const history = raw && raw.length ? (JSON.parse(raw) as Array<{ value: string; ts: number }>) : [];
        // avoid duplicate consecutive entries
        if (!history.length || history[0].value !== no) {
          history.unshift({ value: no, ts: Date.now() });
          await LocalStorage.setItem("tc-history", JSON.stringify(history.slice(0, 50)));
        }
      } catch {
        // ignore storage errors
      }
    })();
  }, [no]);

  return (
    <Detail
      markdown={`# Generated TC\n\n\`${no}\``}
      actions={
        <ActionPanel>
          <Action
            title="Copy to Clipboard"
            shortcut={Keyboard.Shortcut.Common.Copy}
            onAction={async () => {
              await Clipboard.copy(no);
              await showToast({ style: Toast.Style.Success, title: "Copied to clipboard", message: no });
            }}
          />
          <Action
            title="Save as Last"
            onAction={async () => {
              await LocalStorage.setItem("last-generate-tc", no);
              // append to history
              try {
                const raw = await LocalStorage.getItem<string>("tc-history");
                const history = raw && raw.length ? (JSON.parse(raw) as Array<{ value: string; ts: number }>) : [];
                history.unshift({ value: no, ts: Date.now() });
                // keep most recent 50
                await LocalStorage.setItem("tc-history", JSON.stringify(history.slice(0, 50)));
              } catch {
                // ignore storage errors
              }
              await showToast({ style: Toast.Style.Success, title: "Saved as last", message: no });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
