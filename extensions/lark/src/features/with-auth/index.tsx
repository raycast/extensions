import { Action, ActionPanel, Detail, openExtensionPreferences } from '@raycast/api';
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { parse } from 'tough-cookie';
import { isAuthenticatedAtom } from '../../hooks/atoms';
import { checkAuthState, setAuthData } from '../../services/shared';
import { DOMAIN } from '../../utils/config';
import { QRLogin } from './qr-login';

const AuthGuard = ({ children }: { children: React.ReactElement }) => {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const [checked, setChecked] = useState(isAuthenticated);
  const [, refresh] = useState(0);

  useEffect(() => {
    checkAuthState().finally(() => setChecked(true));
  }, []);

  const handleLogin = async (cookies: string[]) => {
    for (const item of cookies) {
      const cookie = parse(item);
      if (!cookie) return;
      if (cookie.key === 'session') {
        await setAuthData(cookie.value);
        refresh(Math.random());
        break;
      }
    }
  };

  if (!DOMAIN) return <MissingDomain />;

  return checked ? isAuthenticated ? children : <QRLogin onConfirm={handleLogin} /> : <Detail markdown="" />;
};

const MissingDomain = () => {
  const markdown = 'Due to your choice of self-hosted deployment, please fill in the self-hosted domain name.';

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
};

export const withAuth =
  <T extends Record<string, unknown>>(Component: React.ComponentType<T>): React.FC<T> =>
  (props: T) => (
    <AuthGuard>
      <Component {...props} />
    </AuthGuard>
  );
