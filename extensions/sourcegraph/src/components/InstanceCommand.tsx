import { ActionPanel, Detail, Action, Icon, openExtensionPreferences } from "@raycast/api";
import { useEffect } from "react";

import checkAuthEffect from "../hooks/checkAuthEffect";
import { bold } from "../markdown";
import { sourcegraphInstance, Sourcegraph } from "../sourcegraph";

/**
 * InstanceCommand wraps the given command with the configuration for a specific
 * Sourcegraph instance.
 */
export default function InstanceCommand({ Command }: { Command: React.FunctionComponent<{ src: Sourcegraph }> }) {
  const tryCloudMessage = "Alternatively, you can try the Sourcegraph.com version of this command first.";

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
    return (
      <Detail
        navigationTitle="No Sourcegraph Self-Hosted instance configured"
        markdown={`${bold(
          `⚠️ No Sourcegraph Sourcegraph Self-Hosted instance configured`
        )} - please set one up in the extension preferences to use this command!\n\n${tryCloudMessage}`}
        actions={
          <ActionPanel>
            {setupGuideAction}
            {openPreferencesAction}
          </ActionPanel>
        }
      />
    );
  }
  try {
    new URL(src.instance);
  } catch (e) {
    return (
      <Detail
        navigationTitle="Invalid Sourcegraph Self-Hosted URL"
        markdown={`${bold(
          `⚠️ Sourcegraph Self-Hosted URL '${src.instance}' is invalid:`
        )} ${e}\n\nUpdate it in the extension preferences!\n\n${tryCloudMessage}`}
        actions={
          <ActionPanel>
            {openPreferencesAction}
            {setupGuideAction}
          </ActionPanel>
        }
      />
    );
  }
  if (!src.token) {
    return (
      <Detail
        navigationTitle="Invalid Sourcegraph Self-Hosted access token"
        markdown={`${bold(
          `⚠️ A token is required for Sourcegraph Self-Hosted instance '${src.instance}'`
        )} - please add an access token for Sourcegraph Self-Hosted in the extension preferences!\n\n${tryCloudMessage}`}
        actions={
          <ActionPanel>
            {openPreferencesAction}
            {setupGuideAction}
          </ActionPanel>
        }
      />
    );
  }

  useEffect(checkAuthEffect(src));

  return <Command src={src} />;
}
