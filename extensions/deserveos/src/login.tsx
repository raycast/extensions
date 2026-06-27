import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  popToRoot,
  showToast,
  Toast,
} from '@raycast/api';
import { showFailureToast, usePromise } from '@raycast/utils';

import { authorize, isConnected, logout } from './lib/oauth';
import { getWorkspaceUrl } from './lib/preferences';

export default function Command() {
  const { data: connected, isLoading, revalidate } = usePromise(isConnected);

  const onConnect = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: 'Opening browser to sign in…',
    });
    try {
      await authorize();
      toast.style = Toast.Style.Success;
      toast.title = 'Connected to DeserveOS';
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: 'Sign-in failed' });
      revalidate();
    }
  };

  const onSignOut = async () => {
    await logout();
    await showToast({ style: Toast.Style.Success, title: 'Signed out' });
    revalidate();
  };

  const markdown = connected
    ? [
        '# ✅ Connected to DeserveOS',
        '',
        `Workspace: \`${getWorkspaceUrl()}\``,
        '',
        "You're signed in. Use **Ask Your CRM**, **Today's Briefing**, **Reminders & Tasks**, or **Search CRM**.",
      ].join('\n')
    : [
        '# Sign in to DeserveOS',
        '',
        'Press **↵** to open your browser and sign in — use Google or email, exactly like the web app.',
        '',
        `Workspace: \`${getWorkspaceUrl()}\` _(change in preferences with ⌘,)_`,
      ].join('\n');

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {!connected && (
            <Action
              title="Sign in with Browser"
              icon={Icon.Globe}
              onAction={onConnect}
            />
          )}
          {connected && (
            <Action
              title="Reconnect"
              icon={Icon.ArrowClockwise}
              onAction={onConnect}
            />
          )}
          {connected && (
            <Action
              title="Sign Out"
              icon={Icon.Logout}
              style={Action.Style.Destructive}
              onAction={onSignOut}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
