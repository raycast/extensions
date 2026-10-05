import {
  MenuBarExtra,
  Icon,
  Color,
  showToast,
  Toast,
  launchCommand,
  LaunchType,
  open,
} from '@raycast/api';
import { showFailureToast } from '@raycast/utils';
import { useEffect, useState, useCallback, useRef } from 'react';
import { checkVpnStatus, runCommand } from './utils/vpnService';
import {
  fetchCurrentIPInfo,
  formatIPInfo,
  IPInfo,
} from './utils/fetchCurrentIP';
import {
  notifyVpnStatusChange,
  subscribeToVpnStatusChange,
} from './utils/vpnCache';

export default function Command() {
  const [vpnStatus, setVpnStatus] = useState<boolean | null>(null);
  const [serverCity, setServerCity] = useState<string>('Unknown');
  const [serverCountry, setServerCountry] = useState<string>('Unknown');
  const [currentIPInfo, setCurrentIPInfo] = useState<IPInfo | null>(null);
  const [ipLoading, setIpLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchedServerRef = useRef<string>('');

  // Refresh VPN status
  const refreshStatus = useCallback(
    async (silent = false, shouldFetchIP = true, forceFetchIP = false) => {
      try {
        if (!silent) console.log('Refreshing VPN status...');

        const status = await checkVpnStatus();

        setVpnStatus(status.isActive);
        setServerCity(status.serverCity);
        setServerCountry(status.serverCountry);

        // Fetch IP if connected and (force requested, server changed, or prior attempt failed/missing)
        if (status.isActive) {
          const serverKey = `${status.serverCity}|${status.serverCountry}`;
          const isMissingOrFailedIP = !currentIPInfo;

          if (
            shouldFetchIP &&
            (forceFetchIP ||
              serverKey !== lastFetchedServerRef.current ||
              isMissingOrFailedIP)
          ) {
            try {
              setIpLoading(true);
              const ipInfo = await fetchCurrentIPInfo();
              setCurrentIPInfo(ipInfo);
              if (ipInfo) {
                lastFetchedServerRef.current = serverKey;
              } else {
                lastFetchedServerRef.current = '';
              }
            } catch (error) {
              console.error('Error fetching IP:', error);
              setCurrentIPInfo(null);
              lastFetchedServerRef.current = '';
            } finally {
              setIpLoading(false);
            }
          }
        } else {
          lastFetchedServerRef.current = '';
          setCurrentIPInfo(null);
        }

        return status;
      } catch (error) {
        console.error('Error fetching VPN status:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [currentIPInfo]
  );

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
        // Poll status without querying external IP service on every attempt
        const status = await refreshStatus(true, false);

        if (status && status.isActive === expectedStatus) {
          console.log('Status matched!');

          // If connected, fetch the external IP once for the new connection
          if (expectedStatus) {
            refreshStatus(true, true, true);
          }

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
  const openMozillaVPN = useCallback(async () => {
    try {
      await open('/Applications/Mozilla VPN.app');
    } catch (error) {
      console.error('Error opening Mozilla VPN:', error);
      await showFailureToast(error, { title: 'Failed to open Mozilla VPN' });
    }
  }, []);

  // Initial load and cache subscription
  useEffect(() => {
    refreshStatus();
    const unsubscribe = subscribeToVpnStatusChange(() => {
      refreshStatus(true, true, true);
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

  const ipSubtitle = !vpnStatus
    ? 'Not connected'
    : ipLoading
      ? 'Loading...'
      : currentIPInfo
        ? formatIPInfo(currentIPInfo)
        : 'IP unavailable';

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
            subtitle={ipSubtitle}
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
            await showFailureToast(error, { title: 'Failed to open command' });
          }
        }}
      />

      <MenuBarExtra.Separator />

      <MenuBarExtra.Item
        title="Refresh Status"
        icon={Icon.RotateClockwise}
        onAction={() => refreshStatus(false, true, true)}
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
            await showFailureToast(error, { title: 'Failed to open command' });
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
