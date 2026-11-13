import { Action, ActionPanel, Keyboard, openExtensionPreferences } from '@raycast/api';

import { AdjacentError } from '../lib/api';
import { hasApiKey } from '../lib/prefs';
import { site } from '../lib/urls';

export function OpenPreferencesAction() {
  return (
    <Action
      title="Preferences"
      shortcut={Keyboard.Shortcut.Common.Open}
      onAction={openExtensionPreferences}
    />
  );
}

export function ErrorActions({ error }: { error: unknown }) {
  const upgradeUrl = error instanceof AdjacentError ? error.upgradeUrl : undefined;
  return (
    <ActionPanel>
      {upgradeUrl ? <Action.OpenInBrowser title="Upgrade" url={upgradeUrl} /> : null}
      {!hasApiKey() ? (
        <Action.OpenInBrowser title="Create API Key" url={site.settingsKeys} />
      ) : null}
      <OpenPreferencesAction />
    </ActionPanel>
  );
}
