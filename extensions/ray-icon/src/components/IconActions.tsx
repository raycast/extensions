import { Action, ActionPanel, Clipboard, Icon, open, showHUD, showToast, Toast, Keyboard } from "@raycast/api";
import { exportPng, exportSvg, renderSvg, tempPng } from "../lib/render";
import { IconSettings, raySoUrl } from "../lib/settings";
import { recordHistory } from "../lib/library";

async function run(settings: IconSettings, title: string, task: () => Promise<string | void>) {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    const path = await task();
    toast.style = Toast.Style.Success;
    toast.title = path ? "Saved" : "Copied";
    if (path) {
      toast.message = path;
      toast.primaryAction = { title: "Show in Finder", onAction: () => open(path, "com.apple.finder") };
    }
    try {
      recordHistory(settings);
    } catch {
      // The export succeeded: don't report a failure that could cause a duplicate retry.
      toast.title = path ? "Saved; History Unavailable" : "Copied; History Unavailable";
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Export failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

export function ExportActions({ settings }: { settings: IconSettings }) {
  return (
    <>
      <ActionPanel.Section title="Export">
        <Action
          title="Save PNG"
          icon={Icon.Download}
          shortcut={Keyboard.Shortcut.Common.Save}
          onAction={() => run(settings, "Rendering PNG…", () => exportPng(settings))}
        />
        <Action
          title="Copy PNG"
          icon={Icon.Clipboard}
          shortcut={Keyboard.Shortcut.Common.Copy}
          onAction={() =>
            run(settings, "Rendering PNG…", async () => {
              await Clipboard.copy({ file: await tempPng(settings) });
              await showHUD("Copied PNG to clipboard");
            })
          }
        />
        <Action
          title="Save SVG"
          icon={Icon.Code}
          shortcut={Keyboard.Shortcut.Common.Duplicate}
          onAction={() => run(settings, "Saving SVG…", async () => exportSvg(settings))}
        />
        <Action
          title="Copy SVG Code"
          icon={Icon.Clipboard}
          onAction={() =>
            run(settings, "Copying SVG…", async () => {
              await Clipboard.copy(renderSvg(settings));
            })
          }
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        <ActionPanel.Submenu title="Save PNG at Size…" icon={Icon.Maximize}>
          {[64, 128, 256, 1024, 2048].map((size) => (
            <Action
              key={size}
              title={`${size} × ${size}`}
              onAction={() => run(settings, "Rendering PNG…", () => exportPng(settings, size))}
            />
          ))}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
      {settings.customSvg ? null : (
        <ActionPanel.Section>
          <Action.OpenInBrowser
            title="Open in ray.so"
            url={raySoUrl(settings)}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.CopyToClipboard
            title="Copy ray.so Link"
            content={raySoUrl(settings)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          />
        </ActionPanel.Section>
      )}
    </>
  );
}
