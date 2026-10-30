import { Action, ActionPanel, Detail, environment, Icon, Keyboard, open, showToast, Toast } from "@raycast/api";
import { existsSync } from "node:fs";
import { noticeCard, WIDE } from "./cards";
import { image, setAppearance } from "./draw";
import { APP_URL, BREW_INSTALL, MissingCLIError } from "./kilobat";

// Draw the cards for Raycast's current theme.
setAppearance(environment.appearance);

export const appInstalled = () => existsSync("/Applications/Kilobat.app");

/** Opens Kilobat at `link` (a kilobat:// path such as "share/speed" or "open/history"), or its website when it isn't installed. */
export function KilobatAppAction({ title, link = "open/overview" }: { title?: string; link?: string }) {
  return appInstalled() ? (
    <Action
      title={title ?? "Open Kilobat"}
      icon={{ fileIcon: "/Applications/Kilobat.app" }}
      shortcut={Keyboard.Shortcut.Common.Open}
      onAction={() => open(`kilobat://${link}`)}
    />
  ) : (
    <Action.OpenInBrowser
      title="Get the Kilobat App"
      icon={Icon.Download}
      url={APP_URL}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}

export function MissingCLI() {
  return (
    <Detail
      navigationTitle="Install the Kilobat CLI"
      markdown={image(
        noticeCard(
          "Install the Kilobat CLI",
          "This extension runs the free, open-source kilobat command. Install it with Homebrew, then open this command again.\n\nInstalled it somewhere else? Set its path in this extension's preferences. The Kilobat app adds the menu bar, history, alerts and blocking.",
          { tagText: "Setup", command: BREW_INSTALL },
        ),
        WIDE,
        "Install the Kilobat CLI",
      )}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Install Command" content={BREW_INSTALL} />
          <Action.OpenInBrowser title="Open Kilobat.app" url={APP_URL} />
        </ActionPanel>
      }
    />
  );
}

/** A failed run, in the same panel as everything else. */
export function ErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  if (error instanceof MissingCLIError) return <MissingCLI />;
  return (
    <Detail
      markdown={image(noticeCard("Kilobat couldn't answer", error.message, { tone: "error" }), WIDE, "Error")}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <KilobatAppAction />
        </ActionPanel>
      }
    />
  );
}

export function failureToast(error: unknown) {
  if (error instanceof MissingCLIError) return;
  showToast({
    style: Toast.Style.Failure,
    title: "Kilobat failed",
    message: String((error as Error)?.message ?? error),
  });
}
