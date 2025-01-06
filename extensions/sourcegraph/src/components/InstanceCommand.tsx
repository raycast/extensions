import {
  ActionPanel,
  Detail,
  Action,
  Icon,
  openExtensionPreferences,
  updateCommandMetadata,
  LaunchProps,
} from "@raycast/api";
import { useEffect } from "react";

import checkAuthEffect from "../hooks/checkAuthEffect";
import { bold } from "../markdown";
import { sourcegraphInstance, Sourcegraph, instanceName } from "../sourcegraph";

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
  const tryDotComMessage = "Alternatively, you can try the 'Sourcegraph.com' commands for public code first.";

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

  const src = sourcegraphInstance();
  if (!src) {
    updateCommandMetadata({ subtitle: null });
    return (
      <Detail
        navigationTitle="No Sourcegraph connection configured"
        markdown={`${bold(
          `⚠️ No Sourcegraph connection configured`,
        )} - please set one up in the extension preferences to use this command!\n\n${tryDotComMessage}`}
        actions={
          <ActionPanel>
            {openPreferencesAction}
            {setupGuideAction}
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
        navigationTitle="Invalid Sourcegraph URL"
        markdown={`${bold(
          `⚠️ Sourcegraph URL '${src.instance}' is invalid:`,
        )} ${e}\n\nUpdate it in the extension preferences!\n\n${tryDotComMessage}`}
        actions={
          <ActionPanel>
            {setupGuideAction}
            {openPreferencesAction}
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
        )} - please add an access token for this Sourcegraph connection in the extension preferences!\n\n${tryDotComMessage}`}
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
