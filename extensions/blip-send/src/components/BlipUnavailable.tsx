import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { launchBlip } from "../hooks/useBlipState";
import { isWindows, thisComputerInline } from "../platform";
import { OpenBlipAction } from "./OpenBlipAction";

interface Props {
  onReady?: () => void;
  navigationTitle?: string;
}

/** Shown when the Blip app is not running or is not signed in. */
export function BlipUnavailable({ onReady, navigationTitle }: Props) {
  const [launching, setLaunching] = useState(false);

  async function open() {
    setLaunching(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Opening Blip…" });
    const ready = await launchBlip().catch(() => false);
    setLaunching(false);
    if (ready) {
      toast.style = Toast.Style.Success;
      toast.title = "Blip is running";
      onReady?.();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Blip did not start";
      toast.message = isWindows
        ? "Open Blip from the Start menu, then try again."
        : "Open Blip from your Applications folder, then try again.";
    }
  }

  return (
    <List isLoading={launching} navigationTitle={navigationTitle} searchBarPlaceholder="">
      <List.EmptyView
        icon={Icon.Bolt}
        title="Blip is not running"
        description={`This extension talks to the Blip app on ${thisComputerInline}. Open Blip and stay signed in, then come back.`}
        actions={
          <ActionPanel>
            <Action title="Open Blip" icon={Icon.Bolt} onAction={open} />
            <Action.OpenInBrowser title="Get Blip" url="https://blip.net" />
          </ActionPanel>
        }
      />
    </List>
  );
}

export function NotSignedIn() {
  return (
    <List searchBarPlaceholder="">
      <List.EmptyView
        icon={Icon.PersonCircle}
        title="Sign in to Blip"
        description="Blip is running but no account is signed in. Finish the sign-in inside Blip, then come back."
        actions={
          <ActionPanel>
            <OpenBlipAction />
          </ActionPanel>
        }
      />
    </List>
  );
}

interface ErrorProps {
  error: Error;
  onRetry: () => void;
  navigationTitle?: string;
}

/**
 * Shown when Blip is running but the call failed, for example when it returns an
 * error, drops the connection, or sends state this version cannot read. Without
 * this the list would look empty, which reads as "you have nothing" instead of
 * "something went wrong".
 */
export function BlipError({ error, onRetry, navigationTitle }: ErrorProps) {
  return (
    <List navigationTitle={navigationTitle} searchBarPlaceholder="">
      <List.EmptyView
        icon={{ source: Icon.Warning, tintColor: Color.Red }}
        title="Could not read Blip"
        description={`${error.message}\n\nBlip may have updated. Try again, or restart Blip.`}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.Redo} onAction={onRetry} />
            <OpenBlipAction />
            <Action.CopyToClipboard title="Copy Error Message" content={error.message} />
          </ActionPanel>
        }
      />
    </List>
  );
}
