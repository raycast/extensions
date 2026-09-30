import {
  ActionPanel,
  Detail,
  Action,
  Icon,
  openExtensionPreferences,
  updateCommandMetadata,
  LaunchProps,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import { OAuthService, usePromise } from "@raycast/utils";

import checkAuthEffect from "../hooks/checkAuthEffect";
import { bold } from "../markdown";
import { sourcegraphInstance, Sourcegraph, instanceName, usesOAuth } from "../sourcegraph";
import ExpandableToast from "./ExpandableToast";

const ALTERNATIVE_ACTIONS_CTA = `---

Don't have a Sourcegraph instance or workspace? Try **[Sourcegraph workspaces](https://workspaces.sourcegraph.com)**: an AI & search experience for your private code.

Alternatively, you can try the 'Search Public Code' command for public code search on [Sourcegraph.com](https://sourcegraph.com/search) for free.`;

function SetupGuideAction() {
  return (
    <Action.OpenInBrowser
      title="View Setup Guide"
      icon={Icon.QuestionMark}
      url="https://www.raycast.com/bobheadxi/sourcegraph#setup"
    />
  );
}

function OpenPreferencesAction() {
  return <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />;
}

function OAuthDetail({ src, revalidate }: { src: Sourcegraph & { oauth: OAuthService }; revalidate: () => void }) {
  const [shouldAuthorize, setShouldAuthorize] = useState(true);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (shouldAuthorize && !hasStarted.current) {
      hasStarted.current = true;
      src.oauth
        .authorize()
        .then(() => revalidate())
        .catch(() => {
          setShouldAuthorize(false);
        });
    }
  }, [shouldAuthorize, src, revalidate]);

  if (shouldAuthorize) {
    return <Detail isLoading={true} navigationTitle="Signing in to Sourcegraph..." />;
  }

  return (
    <Detail
      navigationTitle="Sign in to Sourcegraph"
      markdown={`${bold(
        `⚠️ Sign in to Sourcegraph instance '${instanceName(src)}'`,
      )}\n\nPress 'Enter' to sign in via the configured OAuth client.`}
      actions={
        <ActionPanel>
          <Action
            title="Sign In"
            icon={Icon.LockUnlocked}
            onAction={async () => {
              await src.oauth.authorize();
              revalidate();
            }}
          />
          <OpenPreferencesAction />
        </ActionPanel>
      }
    />
  );
}

function InstanceCommandContent({
  src,
  revalidate,
  Command,
  props,
}: {
  src: Sourcegraph;
  revalidate: () => void;
  Command: React.FunctionComponent<{ src: Sourcegraph; props?: LaunchProps }>;
  props?: LaunchProps;
}) {
  try {
    new URL(src.instance);
  } catch (e) {
    updateCommandMetadata({ subtitle: null });
    return (
      <Detail
        navigationTitle="Invalid Sourcegraph connection URL"
        markdown={`${bold(
          `⚠️ Sourcegraph URL '${src.instance}' is invalid:`,
        )} ${e}\n\nUpdate it in the extension preferences! Press 'Enter' to view the setup guide.\n\n${ALTERNATIVE_ACTIONS_CTA}`}
        actions={
          <ActionPanel>
            <SetupGuideAction />
            <OpenPreferencesAction />
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
    if (usesOAuth(src)) {
      return <OAuthDetail src={src} revalidate={revalidate} />;
    }

    return (
      <Detail
        navigationTitle="Not authenticated to Sourcegraph"
        markdown={`${bold(
          `⚠️ Authentication is required for '${src.instance}'`,
        )}\n\nPlease create an access token (\`sgp_...\`) under the "Access tokens" tab in your user settings in Sourcegraph (e.g. [${src.instance}/user/settings/tokens/new](${src.instance}/user/settings/tokens/new)).

${ALTERNATIVE_ACTIONS_CTA}`}
        actions={
          <ActionPanel>
            <OpenPreferencesAction />
            <SetupGuideAction />
          </ActionPanel>
        }
      />
    );
  }

  useEffect(checkAuthEffect(src), []);

  return <Command src={src} props={props} />;
}

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
  const { push } = useNavigation();
  const { data: src, isLoading, error, revalidate } = usePromise(sourcegraphInstance);

  useEffect(() => {
    if (error) {
      ExpandableToast(push, "Connection Failed", "Could not connect to Sourcegraph", String(error)).show();
    }
  }, [error, push]);

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!src) {
    updateCommandMetadata({ subtitle: null });
    return (
      <Detail
        navigationTitle="No Sourcegraph connection configured"
        markdown={`${bold(
          `⚠️ No Sourcegraph connection configured`,
        )} - press 'Enter' to set one up in the extension preferences to use this command!\n\n${ALTERNATIVE_ACTIONS_CTA}`}
        actions={
          <ActionPanel>
            <OpenPreferencesAction />
            <SetupGuideAction />
          </ActionPanel>
        }
      />
    );
  }

  return <InstanceCommandContent src={src} revalidate={revalidate} Command={Command} props={props} />;
}
