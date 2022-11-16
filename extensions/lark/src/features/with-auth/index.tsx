import { Detail } from '@raycast/api';
import { useEffect, useState } from 'react';
import { parse } from 'tough-cookie';
import { checkAuthState, isAuthenticated, setAuthData } from '../../services/shared';
import { QRLogin } from './qr-login';

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

  return checked ? isAuthenticated ? <Component /> : <QRLogin onConfirm={handleLogin} /> : <Detail markdown="" />;
};

export const withAuth =
  (Component: React.FC): React.FC =>
  () =>
    <AuthGuard component={Component} />;
