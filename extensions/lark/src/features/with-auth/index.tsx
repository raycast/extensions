import { Action, ActionPanel, Detail, openExtensionPreferences } from '@raycast/api';
import { useEffect, useState } from 'react';
import { parse } from 'tough-cookie';
import { checkAuthState, isAuthenticated, setAuthData } from '../../services/shared';
import { QRLogin } from './qr-login';
import { DOMAIN } from '../../utils/config';

const AuthGuard: React.FC<{ component: React.FC }> = ({ component: Component }) => {
  const [checked, setChecked] = useState(isAuthenticated);
  const [, refresh] = useState(0);

  useEffect(() => {
    checkAuthState().finally(() => setChecked(true));
  }, []);

  const handleLogin = async (tenantDomain: string, cookies: string[]) => {
    for (const item of cookies) {
      const cookie = parse(item);
      if (!cookie) return;
      if (cookie.key === 'session') {
        await setAuthData(tenantDomain, cookie.value);
        refresh(Math.random());
        break;
      }
    }
  };

  if (!DOMAIN) return <MissingDomain />;

  return checked ? isAuthenticated ? <Component /> : <QRLogin onConfirm={handleLogin} /> : <Detail markdown="" />;
};

const MissingDomain = () => {
  const markdown = 'Due to your choice of self-hosted deployment, please fill in the self-hosted domain name.';

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
            shortcut={{ key: 'enter', modifiers: [] }}
          />
        </ActionPanel>
      }
    />
  );
};

export const withAuth =
  (Component: React.FC): React.FC =>
  () =>
    <AuthGuard component={Component} />;
