import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { launchBlip } from "../hooks/useBlipState";

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
      toast.message = "Open Blip from your Applications folder, then try again.";
    }
  }

  return (
    <List isLoading={launching} navigationTitle={navigationTitle} searchBarPlaceholder="">
      <List.EmptyView
        icon={Icon.Bolt}
        title="Blip is not running"
        description="This extension talks to the Blip app on your Mac. Open Blip and stay signed in, then come back."
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
            <Action.Open title="Open Blip" target="/Applications/Blip.app" icon={Icon.Bolt} />
          </ActionPanel>
        }
      />
    </List>
  );
}
