import { Action, ActionPanel, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { GlimpseError, openGlimpseApp } from "./glimpse";

const PRICING_URL = "https://tryglimpse.cc/#pricing";

// Shown in place of a list when its load fails, so the fix is one action away.
export function ErrorEmptyView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const kind = error instanceof GlimpseError ? error.kind : "other";
  const retry = (
    <Action
      title="Try Again"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRetry}
    />
  );

  if (kind === "missing_cli") {
    return (
      <List.EmptyView
        icon={Icon.Terminal}
        title="Glimpse CLI Not Found"
        description="In Glimpse, open Settings, About and click Install CLI."
        actions={
          <ActionPanel>
            <Action title="Open Glimpse" icon={Icon.AppWindow} onAction={openApp} />
            {retry}
          </ActionPanel>
        }
      />
    );
  }

  if (kind === "not_running") {
    return (
      <List.EmptyView
        icon={Icon.AppWindow}
        title="Glimpse Isn't Running"
        description="Open Glimpse, then try again."
        actions={
          <ActionPanel>
            <Action title="Open Glimpse" icon={Icon.AppWindow} onAction={openApp} />
            {retry}
          </ActionPanel>
        }
      />
    );
  }

  if (kind === "outdated") {
    return (
      <List.EmptyView
        icon={Icon.ArrowClockwise}
        title="Update Glimpse"
        description={error.message}
        actions={
          <ActionPanel>
            <Action title="Open Glimpse" icon={Icon.AppWindow} onAction={openApp} />
            {retry}
          </ActionPanel>
        }
      />
    );
  }

  if (kind === "license") {
    return (
      <List.EmptyView
        icon={Icon.Lock}
        title="License Required"
        description={error.message}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Pricing" url={PRICING_URL} />
            {retry}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="Couldn't Load"
      description={error.message}
      actions={<ActionPanel>{retry}</ActionPanel>}
    />
  );
}

async function openApp() {
  try {
    await openGlimpseApp();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't open Glimpse",
      message: "Install it from tryglimpse.cc.",
    });
  }
}
