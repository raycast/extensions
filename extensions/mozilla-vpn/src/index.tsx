import React, { useEffect, useState } from 'react';
import { List, showToast, Toast, ActionPanel, Action } from '@raycast/api';
import { fetchCurrentIP } from './utils/fetchCurrentIP';
import { checkVpnStatus, runCommand } from './utils/vpnService';
import VpnStatus from './components/vpnStatus';
import CheckLogin from './components/checkLogin';
import fs from 'fs';

const MOZILLA_VPN_PATH = '/Applications/Mozilla VPN.app';

const isMozillaVpnInstalled = () => {
  try {
    return fs.existsSync(MOZILLA_VPN_PATH);
  } catch (error) {
    console.error('Error checking Mozilla VPN installation:', error);
    return false;
  }
};

const Command: React.FC = () => {
  const [currentIP, setCurrentIP] = useState<string>(
    'Fetching IP and location...'
  );
  const [vpnStatus, setVpnStatus] = useState<boolean | null>(null);
  const [serverCity, setServerCity] = useState<string>('Loading...');
  const [isLoading, setIsLoading] = useState(true);
  const [authCheckLoading, setAuthCheckLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleVpn = async () => {
    if (vpnStatus === null) return; // Ensure the VPN status is known
    const action = vpnStatus ? 'deactivate' : 'activate';
    const actionText = action === 'activate' ? 'Connecting' : 'Disconnecting';

    // Show the initial loading toast
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: `${actionText} Mozilla VPN...`,
    });

    try {
      await runCommand(action);
      const { isActive, serverCity, isAuthenticated } = await checkVpnStatus();
      setVpnStatus(isActive);
      setServerCity(serverCity);
      setIsAuthenticated(isAuthenticated);

      // Update to success toast
      loadingToast.style = Toast.Style.Success;
      loadingToast.title = `VPN ${isActive ? 'activated' : 'deactivated'} successfully.`;

      // Update the IP address after the VPN status changes
      setTimeout(async () => {
        const newIP = await fetchCurrentIP();
        setCurrentIP(newIP);
      }, 1000);
    } catch (error: unknown) {
      console.error(`Failed to ${action} VPN:`, error);
      loadingToast.style = Toast.Style.Failure;
      loadingToast.title = `VPN ${action} failed`;
      loadingToast.message =
        error instanceof Error ? error.message : String(error);
    }
  };

  const fetchInitialData = async () => {
    try {
      const ip = await fetchCurrentIP();
      setCurrentIP(ip);
      const { isActive, serverCity, isAuthenticated } = await checkVpnStatus();
      setVpnStatus(isActive);
      setServerCity(serverCity);
      setIsAuthenticated(isAuthenticated);
      setAuthCheckLoading(false);
      setErrorMessage(null); // Clear any previous error messages
    } catch (error: unknown) {
      console.error('Error fetching initial data:', error);
      showToast(Toast.Style.Failure, 'Error', 'Failed to fetch initial data.');
      setCurrentIP('Unavailable');
      setServerCity('Unavailable');
      setAuthCheckLoading(false);
      setErrorMessage('Failed to fetch initial data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMozillaVpnInstalled()) {
      fetchInitialData();
      setErrorMessage(null); // Clear previous error
    } else {
      setIsLoading(false); // Stop loading if Mozilla VPN is not installed
      setErrorMessage('Mozilla VPN application is not installed.');
    }
  }, []);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (errorMessage) {
    return (
      <List>
        <List.EmptyView
          title="Mozilla VPN Error"
          description={errorMessage}
          icon="⚠️"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url="https://www.mozilla.org/en-US/products/vpn/download/"
                title="Download Mozilla VPN"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (authCheckLoading) {
    return <List isLoading={true} />;
  }

  if (!isAuthenticated) {
    return (
      <List isLoading={false}>
        <CheckLogin />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail={false}>
      <VpnStatus
        vpnStatus={vpnStatus}
        serverCity={serverCity}
        onToggleVpn={toggleVpn}
      />
      <List.Item title="Current IP Address and Location" subtitle={currentIP} />
    </List>
  );
};

export default Command;
