import React, { useEffect, useState } from 'react';
import { List, showToast, Toast } from '@raycast/api';
import { fetchCurrentIP } from './utils/fetchCurrentIP';
import { checkVpnStatus, runCommand } from './utils/vpnService';
import VpnStatus from './components/vpnStatus';

const Command: React.FC = () => {
  const [currentIP, setCurrentIP] = useState<string>(
    'Fetching IP and location...'
  );
  const [vpnStatus, setVpnStatus] = useState<boolean | null>(null);
  const [serverCity, setServerCity] = useState<string>('Loading...');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const ip = await fetchCurrentIP();
      setCurrentIP(ip);
      const { isActive, serverCity } = await checkVpnStatus();
      setVpnStatus(isActive);
      setServerCity(serverCity);
    } catch (error: unknown) {
      console.error(
        'Error fetching initial data:',
        error instanceof Error ? error.message : error
      );
      showToast(Toast.Style.Failure, 'Error', 'Failed to fetch initial data.');
    }
  };

  const toggleVpn = async () => {
    if (vpnStatus === null) return; // Ensure the VPN status is known
    const action = vpnStatus ? 'deactivate' : 'activate';
    try {
      await runCommand(action);
      const { isActive, serverCity } = await checkVpnStatus();
      setVpnStatus(isActive);
      setServerCity(serverCity);
      showToast(
        Toast.Style.Success,
        `VPN ${isActive ? 'activated' : 'deactivated'} successfully.`
      );
      setTimeout(async () => {
        const newIP = await fetchCurrentIP();
        setCurrentIP(newIP);
      }, 1000);
    } catch (error: unknown) {
      console.error(
        `Failed to ${action} VPN:`,
        error instanceof Error ? error.message : error
      );
      showToast(
        Toast.Style.Failure,
        `VPN ${action} failed`,
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  return (
    <List>
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
