import {
  Action,
  ActionPanel,
  closeMainWindow,
  environment,
  getPreferenceValues,
  Icon,
  List,
  open,
  openExtensionPreferences,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import {
  controls,
  deepLinks,
  helperArguments,
  isHighlightDeepLink,
  validateAppPath,
  type Control,
} from "./commands";

const execFileAsync = promisify(execFile);

async function sendControl(appPath: string, control: Control) {
  try {
    if (!existsSync(appPath))
      throw new Error(
        "Install Highlight AI and finish its setup before using these controls.",
      );
    await closeMainWindow({ popToRootType: PopToRootType.Suspended });
    const { stdout } = await execFileAsync(
      "/usr/bin/osascript",
      helperArguments(
        path.join(environment.assetsPath, "control-highlight.js"),
        appPath,
        control,
      ),
      { timeout: 10000, maxBuffer: 8192 },
    );
    if (stdout.trim() !== "SHORTCUT_SENT")
      throw new Error("Highlight did not accept the control request.");
    await showToast({
      style: Toast.Style.Success,
      title: "Shortcut sent to Highlight",
      message: "Finish the action in Highlight.",
    });
  } catch (error) {
    const message =
      error instanceof Error && /HIGHLIGHT_NOT_READY/.test(error.message)
        ? "Open Highlight AI, finish sign-in, and leave its assistant panel visible before retrying."
        : error instanceof Error &&
            /(-1743|-1719|not allowed|assistive|authorized)/i.test(
              error.message,
            )
          ? "Allow Raycast to control System Events in macOS Automation and Accessibility settings, then retry."
          : error instanceof Error && /HIGHLIGHT_IDENTITY/.test(error.message)
            ? "This is not Highlight AI's Highlight.app. Check the extension's app path."
            : error instanceof Error && /foreground/i.test(error.message)
              ? "Highlight lost focus. Retry while its assistant panel is visible."
              : error instanceof Error &&
                  !error.message.startsWith("Command failed:")
                ? error.message
                : "Highlight's control failed. Confirm its panel is open and macOS automation access is allowed.";
    await showToast({
      style: Toast.Style.Failure,
      title: "Highlight control unavailable",
      message,
    });
  }
}

async function openLink(appPath: string, url: string) {
  if (!isHighlightDeepLink(url)) return;
  try {
    await open(url, appPath);
    await closeMainWindow({ popToRootType: PopToRootType.Suspended });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't open Highlight",
      message: "Check that Highlight AI is installed and signed in.",
    });
  }
}

export default function Command() {
  let appPath = "";
  let error = "";
  try {
    appPath = validateAppPath(
      getPreferenceValues<{ appPath?: string }>().appPath ?? "",
    );
  } catch (failure) {
    error = String(failure);
  }
  const installed = !error && existsSync(appPath);
  return (
    <List searchBarPlaceholder="Search Highlight controls">
      <List.Section
        title={installed ? "Highlight AI" : "Setup Required"}
        subtitle={
          installed
            ? "Leave the assistant panel open; default app hotkeys required"
            : error || "Highlight AI is not installed at the configured path"
        }
      >
        {controls.map((control) => (
          <List.Item
            key={control.id}
            title={control.title}
            subtitle={control.subtitle}
            icon={
              control.id === "search"
                ? Icon.MagnifyingGlass
                : control.id === "new-chat"
                  ? Icon.Message
                  : Icon.PlusCircle
            }
            accessories={[{ text: control.shortcut }]}
            actions={
              <ActionPanel>
                {installed && (
                  <Action
                    title={control.title}
                    onAction={() => sendControl(appPath, control.id)}
                  />
                )}
                <Action.OpenInBrowser
                  title="Highlight Setup Instructions"
                  url="https://help.highlightai.com/articles/3717913325-how-to-download-and-install-highlight"
                />
                <Action
                  title="Configure App Path"
                  icon={Icon.Gear}
                  onAction={openExtensionPreferences}
                />
                <Action.OpenInBrowser
                  title="Documented Hotkeys"
                  url="https://help.highlightai.com/articles/8511467594-keyboard-shortcuts"
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {installed ? (
        <List.Section
          title="Go To"
          subtitle="Opens directly — no Accessibility access needed"
        >
          {deepLinks.map((link) => (
            <List.Item
              key={link.id}
              title={link.title}
              subtitle={link.subtitle}
              icon={Icon[link.icon]}
              actions={
                <ActionPanel>
                  <Action
                    title={link.title}
                    icon={Icon[link.icon]}
                    onAction={() => openLink(appPath, link.url)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Deep Link"
                    content={link.url}
                  />
                  <Action.CreateQuicklink
                    quicklink={{
                      name: `Highlight: ${link.title}`,
                      link: link.url,
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
