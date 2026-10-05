import {
  MenuBarExtra,
  Icon,
  Color,
  showToast,
  Toast,
  getPreferenceValues,
  launchCommand,
  LaunchType,
} from '@raycast/api';
import { useEffect, useState, useCallback } from 'react';
import { exec } from 'child_process';
import { checkVpnStatus, runCommand } from './utils/vpnService';
import { fetchCurrentIP } from './utils/fetchCurrentIP';
import {
  notifyVpnStatusChange,
  subscribeToVpnStatusChange,
} from './utils/vpnCache';

export default function Command() {
  const preferences = getPreferenceValues<Preferences.Menubar>();
  const [vpnStatus, setVpnStatus] = useState<boolean | null>(null);
  const [serverCity, setServerCity] = useState<string>('Unknown');
  const [serverCountry, setServerCountry] = useState<string>('Unknown');
  const [currentIP, setCurrentIP] = useState<string>('Loading...');
  const [isLoading, setIsLoading] = useState(true);

  // If menubar is disabled, return null (hide it)
  if (!preferences.showMenuBar) {
    return null;
  }

  // Refresh VPN status
  const refreshStatus = useCallback(async (silent = false) => {
    try {
      if (!silent) console.log('Refreshing VPN status...');

      const status = await checkVpnStatus();

      setVpnStatus(status.isActive);
      setServerCity(status.serverCity);
      setServerCountry(status.serverCountry);

      // Fetch IP if connected
      if (status.isActive) {
        try {
          const ip = await fetchCurrentIP();
          setCurrentIP(ip);
        } catch (error) {
          console.error('Error fetching IP:', error);
          setCurrentIP('IP unavailable');
        }
      } else {
        setCurrentIP('Not connected');
      }

      return status;
    } catch (error) {
      console.error('Error fetching VPN status:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Toggle VPN connection
  const toggleVPN = async () => {
    try {
      setIsLoading(true);
      const action = vpnStatus ? 'deactivate' : 'activate';
      const expectedStatus = action === 'activate';
      const actionText = action === 'activate' ? 'Connecting' : 'Disconnecting';

      console.log(`Starting VPN ${action}...`);

      await showToast({
        style: Toast.Style.Animated,
        title: `${actionText} VPN...`,
      });

      await runCommand(action);

      // Wait for the command to execute
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Poll for status change
      let attempts = 0;
      const maxAttempts = 15;

      while (attempts < maxAttempts) {
        const status = await refreshStatus(true);

        if (status && status.isActive === expectedStatus) {
          console.log('Status matched!');

          // Notify other components (main extension) about the change
          notifyVpnStatusChange();

          await showToast({
            style: Toast.Style.Success,
            title: `VPN ${action === 'activate' ? 'connected' : 'disconnected'}`,
          });

          return;
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Timeout
      await showToast({
        style: Toast.Style.Failure,
        title: 'VPN status change timeout',
      });

      await refreshStatus();
    } catch (error) {
      console.error('Error toggling VPN:', error);
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to toggle VPN',
      });
      await refreshStatus();
    } finally {
      setIsLoading(false);
    }
  };

  // Open Mozilla VPN app
  const openMozillaVPN = useCallback(() => {
    exec('open -a "Mozilla VPN"', (error) => {
      if (error) {
        console.error('Error opening Mozilla VPN:', error);
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to open Mozilla VPN',
        });
      }
    });
  }, []);

  // Initial load and cache subscription
  useEffect(() => {
    refreshStatus();
    const unsubscribe = subscribeToVpnStatusChange(() => {
      refreshStatus(true);
    });
    return () => {
      unsubscribe();
    };
  }, [refreshStatus]);

  // Menubar icon based on status
  const icon = vpnStatus
    ? { source: Icon.Lock, tintColor: Color.Green }
    : { source: Icon.LockUnlocked, tintColor: Color.Red };

  const title = vpnStatus ? '🟢 VPN On' : '🔴 VPN Off';

  const subtitle = vpnStatus
    ? `${serverCity}, ${serverCountry}`
    : 'Disconnected';

  return (
    <MenuBarExtra
      icon={icon}
      tooltip={vpnStatus ? `VPN Connected: ${serverCity}` : 'VPN Disconnected'}
      isLoading={isLoading}
    >
      <MenuBarExtra.Item title={title} subtitle={subtitle} />

      <MenuBarExtra.Separator />

      {vpnStatus && (
        <>
          <MenuBarExtra.Item
            title="Server Location"
            subtitle={`${serverCity}, ${serverCountry}`}
            icon={Icon.Globe}
          />
          <MenuBarExtra.Item
            title="IP Address"
            subtitle={currentIP}
            icon={Icon.Network}
          />
          <MenuBarExtra.Separator />
        </>
      )}

      <MenuBarExtra.Item
        title={vpnStatus ? 'Disconnect VPN' : 'Connect VPN'}
        icon={vpnStatus ? Icon.Stop : Icon.Play}
        onAction={toggleVPN}
        shortcut={{ modifiers: ['cmd'], key: 't' }}
      />

      <MenuBarExtra.Item
        title="Change Server"
        icon={Icon.Globe}
        onAction={async () => {
          try {
            await launchCommand({
              name: 'index',
              type: LaunchType.UserInitiated,
              context: { view: 'serverSelector' },
            });
          } catch (error) {
            console.error('Failed to launch server selector:', error);
          }
        }}
      />

      <MenuBarExtra.Separator />

      <MenuBarExtra.Item
        title="Refresh Status"
        icon={Icon.RotateClockwise}
        onAction={() => refreshStatus(false)}
        shortcut={{ modifiers: ['cmd'], key: 'r' }}
      />

      <MenuBarExtra.Item
        title="Open Main Extension"
        icon={Icon.Window}
        onAction={async () => {
          try {
            await launchCommand({
              name: 'index',
              type: LaunchType.UserInitiated,
              context: { view: 'main' },
            });
          } catch (error) {
            console.error('Failed to launch main extension:', error);
          }
        }}
      />

      <MenuBarExtra.Item
        title="Open Mozilla VPN App"
        icon={Icon.AppWindow}
        onAction={openMozillaVPN}
      />
    </MenuBarExtra>
  );
}
