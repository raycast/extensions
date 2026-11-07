import { Action, ActionPanel, Icon, List, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { AuthError, KEYS_URL, appUrl, type Booking, type EventType } from "./api";

export const MEET_ICON = { source: { light: "extension-icon.png", dark: "extension-icon@dark.png" } };

export function modeIcon(b: Pick<Booking, "mode" | "meet_url">) {
  if (b.mode === "phone") return { source: Icon.Phone, tooltip: "Phone call" };
  return { source: Icon.Video, tooltip: "Video call" };
}

export function typeIcon(t: Pick<EventType, "location">) {
  return t.location === "phone" ? Icon.Phone : Icon.Video;
}

export function KeyActions() {
  return (
    <>
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action.OpenInBrowser title="Get a Key in API & Webhooks" url={KEYS_URL()} />
    </>
  );
}

/** One calm view for the two ways a list can fail: no key, or anything else. */
export function ErrorEmptyView({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  if (error instanceof AuthError) {
    return (
      <List.EmptyView
        icon={MEET_ICON}
        title="Add your API key"
        description="Create one in Gaurify Meet: Settings > API & webhooks. Then paste it into this extension's preferences."
        actions={
          <ActionPanel>
            <KeyActions />
          </ActionPanel>
        }
      />
    );
  }
  return (
    <List.EmptyView
      icon={Icon.WifiDisabled}
      title="Something went wrong"
      description={error.message}
      actions={
        <ActionPanel>
          {onRetry ? <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} /> : null}
          <Action.OpenInBrowser title="Open Gaurify Meet" url={appUrl()} />
        </ActionPanel>
      }
    />
  );
}

/** A failure toast that offers the right fix. */
export async function failToast(error: unknown, title = "Couldn't do that") {
  if (error instanceof AuthError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Add your API key",
      message: "Settings > API & webhooks in Gaurify Meet.",
      primaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
    });
    return;
  }
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: error instanceof Error ? error.message : String(error),
  });
}
