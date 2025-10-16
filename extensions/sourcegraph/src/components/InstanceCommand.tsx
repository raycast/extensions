import {
  ActionPanel,
  Detail,
  Action,
  Icon,
  openExtensionPreferences,
  updateCommandMetadata,
  LaunchProps,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useEffect } from "react";

import checkAuthEffect from "../hooks/checkAuthEffect";
import { bold } from "../markdown";
import { sourcegraphInstance, Sourcegraph, instanceName } from "../sourcegraph";
import { tertiaryActionShortcut } from "./shortcuts";

/**
 * InstanceCommand wraps the given command with the configuration for a specific
 * Sourcegraph instance.
 */
export default function InstanceCommand({
  Command,
  props,
}: {
  Command: React.FunctionComponent<{ src: Sourcegraph; props?: LaunchProps }>;
  props?: LaunchProps;
}) {
  const alternativeActionsCTA = `---

Don't have a Sourcegraph instance or workspace? Try **[Sourcegraph workspaces](https://workspaces.sourcegraph.com)**: an AI & search experience for your private code.

Alternatively, you can try the 'Search Public Code' command for public code search on [Sourcegraph.com](https://sourcegraph.com/search) for free with the 'Cmd-Shift-O' shortcut.`;

  const setupGuideAction = (
    <Action.OpenInBrowser
      title="View Setup Guide"
      icon={Icon.QuestionMark}
      url="https://www.raycast.com/bobheadxi/sourcegraph#setup"
    />
  );

  const openPreferencesAction = (
    <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
  );

  const publicCodeSearchAction = (
    <Action
      icon={Icon.MagnifyingGlass}
      title="Try Public Code Search"
      shortcut={tertiaryActionShortcut}
      onAction={async () =>
        launchCommand({
          name: "searchDotCom",
          type: LaunchType.UserInitiated,
        })
      }
    />
  );

  const src = sourcegraphInstance();
  if (!src) {
    updateCommandMetadata({ subtitle: null });
    return (
      <Detail
        navigationTitle="No Sourcegraph connection configured"
        markdown={`${bold(
          `⚠️ No Sourcegraph connection configured`,
        )} - press 'Enter' to set one up in the extension preferences to use this command!\n\n${alternativeActionsCTA}`}
        actions={
          <ActionPanel>
            {openPreferencesAction}
            {setupGuideAction}
            {publicCodeSearchAction}
          </ActionPanel>
        }
      />
    );
  }
  try {
    new URL(src.instance);
  } catch (e) {
    updateCommandMetadata({ subtitle: null });
    return (
      <Detail
        navigationTitle="Invalid Sourcegraph connection URL"
        markdown={`${bold(
          `⚠️ Sourcegraph URL '${src.instance}' is invalid:`,
        )} ${e}\n\nUpdate it in the extension preferences! Press 'Enter' to view the setup guide.\n\n${alternativeActionsCTA}`}
        actions={
          <ActionPanel>
            {setupGuideAction}
            {openPreferencesAction}
            {publicCodeSearchAction}
          </ActionPanel>
        }
      />
    );
  }

  updateCommandMetadata({
    // We've already checked this URL is valid, so we can reliably use it here.
    subtitle: instanceName(src),
  });

  if (!src.token) {
    return (
      <Detail
        navigationTitle="Invalid Sourcegraph access token"
        markdown={`${bold(
          `⚠️ A token is required for Sourcegraph connection '${src.instance}'`,
        )} - please add an access token for this Sourcegraph connection in the extension preferences!\n\n${alternativeActionsCTA}`}
        actions={
          <ActionPanel>
            {setupGuideAction}
            {openPreferencesAction}
          </ActionPanel>
        }
      />
    );
  }

  useEffect(checkAuthEffect(src), []);

  return <Command src={src} props={props} />;
}
