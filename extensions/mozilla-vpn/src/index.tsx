import React, { useEffect, useState } from 'react';
import * as Raycast from '@raycast/api';
import { fetchCurrentIP } from './utils/fetchCurrentIP';
import { checkVpnStatus, runCommand } from './utils/vpnService';
import VpnStatus from './components/vpnStatus';
import CheckLogin from './components/checkLogin';
import ServerSelector from './components/serverSelector';
import ServerDetails from './components/serverDetails';
import fs from 'fs';

const MOZILLA_VPN_PATH = '/Applications/Mozilla VPN.app';

// Extract components with explicit typing to avoid type conflicts
const showToast = Raycast.showToast;
const Toast = Raycast.Toast;
const Icon = Raycast.Icon;
const Color = Raycast.Color;

// Define proper types for Action to avoid 'any' usage
interface ActionProps {
  title: string;
  icon?: unknown;
  onAction?: () => void;
  shortcut?: unknown;
}

interface ActionComponent {
  (props: ActionProps): React.ReactElement | null;
  OpenInBrowser: React.ComponentType<Record<string, unknown>>;
  Push: React.ComponentType<Record<string, unknown>>;
  Pop: React.ComponentType<Record<string, unknown>>;
  Copy: React.ComponentType<Record<string, unknown>>;
  Paste: React.ComponentType<Record<string, unknown>>;
  ShowInFinder: React.ComponentType<Record<string, unknown>>;
  Open: React.ComponentType<Record<string, unknown>>;
  OpenWith: React.ComponentType<Record<string, unknown>>;
  SubmitForm: React.ComponentType<Record<string, unknown>>;
  Trash: React.ComponentType<Record<string, unknown>>;
}

// Type assertion to bypass the complex intersection type issue for Action
const Action = (Raycast as unknown as { Action: ActionComponent }).Action;

// Define proper types for ActionPanel to avoid 'any' usage
interface ActionPanelProps {
  children?: React.ReactNode;
}

interface ActionPanelComponent {
  (props: ActionPanelProps): React.ReactElement | null;
  Section: React.ComponentType<Record<string, unknown>>;
}

// Type assertion to bypass the complex intersection type issue for ActionPanel
const ActionPanel = (
  Raycast as unknown as { ActionPanel: ActionPanelComponent }
).ActionPanel;

// Define proper types to avoid 'any' usage and interface extension issues
interface ListProps {
  isLoading?: boolean;
  navigationTitle?: string;
  children?: React.ReactNode;
}

interface ListComponent {
  (props: ListProps): React.ReactElement | null;
  Item: React.ComponentType<Record<string, unknown>>;
  Section: React.ComponentType<Record<string, unknown>>;
  EmptyView: React.ComponentType<Record<string, unknown>>;
}

// Type assertion to bypass the complex intersection type issue
const List = (Raycast as unknown as { List: ListComponent }).List;

// Define view types for navigation
type ViewType = 'main' | 'serverSelector' | 'serverDetails';

const isMozillaVPNInstalled = () => {
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
  const [serverCountry, setServerCountry] = useState<string>('Loading...');
  const [isLoading, setIsLoading] = useState(true);
  const [authCheckLoading, setAuthCheckLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Replace individual show states with a single currentView state
  const [currentView, setCurrentView] = useState<ViewType>('main');

  const navigateTo = (view: ViewType) => {
    setCurrentView(view);
  };

  const navigateBack = () => {
    // Always navigate back to the main view
    setCurrentView('main');
  };

  const toggleVpn = async () => {
    if (vpnStatus === null) return; // Ensure the VPN status is known
    const action = vpnStatus ? 'deactivate' : 'activate';
    const actionText = action === 'activate' ? 'Connecting' : 'Disconnecting';
    const expectedStatus = action === 'activate'; // The status we expect after toggling

    // Show the initial loading toast
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: `${actionText} Mozilla VPN...`,
    });

    // Set a timeout to prevent the function from hanging indefinitely
    const toggleTimeout = setTimeout(() => {
      console.error(`VPN ${action} operation timed out`);
      loadingToast.style = Toast.Style.Failure;
      loadingToast.title = `VPN ${action} operation timed out`;
      loadingToast.message =
        'The operation is taking longer than expected. The VPN might still be changing state.';

      // Force refresh the data
      fetchInitialData().catch((err) => {
        console.error('Error refreshing data after timeout:', err);
      });
    }, 30000); // 30 second timeout

    try {
      // Execute the command
      await runCommand(action);

      // Wait longer before checking status for activating vs deactivating
      const initialWait = action === 'activate' ? 2000 : 1000;
      await new Promise((resolve) => setTimeout(resolve, initialWait));

      // Poll until VPN status matches expected status or timeout
      let attempts = 0;
      const maxAttempts = 10; // Reduced number of attempts but with longer interval
      let statusMatched = false;

      while (attempts < maxAttempts && !statusMatched) {
        attempts++;

        try {
          console.log(
            `Polling VPN status (attempt ${attempts}/${maxAttempts})...`
          );

          // Check current status
          const status = await checkVpnStatus();

          // If status matches what we expect, we're done
          if (status.isActive === expectedStatus) {
            statusMatched = true;
            setVpnStatus(status.isActive);
            setServerCity(status.serverCity);
            setServerCountry(status.serverCountry);

            // Also update IP after connection change
            try {
              // For connection, wait a bit longer for network to stabilize before fetching IP
              if (action === 'activate') {
                await new Promise((resolve) => setTimeout(resolve, 2000));
              }
              const ip = await fetchCurrentIP();
              setCurrentIP(ip);
            } catch (ipError) {
              console.error('Error fetching IP after VPN toggle:', ipError);
              // Don't fail the whole operation just because IP fetch failed
            }
          } else {
            // Wait longer between polling attempts
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        } catch (pollError) {
          console.error('Error polling VPN status:', pollError);
          // Wait before trying again
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      // If we couldn't confirm the status change after polling, fetch data anyway
      if (!statusMatched) {
        console.log(
          "Status didn't match expected after polling, fetching latest data..."
        );
        try {
          await fetchInitialData();
        } catch (fetchError) {
          console.error('Error fetching data after polling:', fetchError);
        }
      }

      // Clear the timeout since we're done
      clearTimeout(toggleTimeout);

      // Update toast
      loadingToast.style = Toast.Style.Success;
      loadingToast.title = `VPN ${action === 'activate' ? 'activated' : 'deactivated'} successfully.`;
    } catch (error: unknown) {
      console.error(`Failed to ${action} VPN:`, error);

      // Clear the timeout since we're handling the error
      clearTimeout(toggleTimeout);

      loadingToast.style = Toast.Style.Failure;
      loadingToast.title = `VPN ${action} failed`;
      loadingToast.message =
        error instanceof Error ? error.message : String(error);

      // Give a moment for the network to stabilize if there was an error
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Try to get current status anyway
      try {
        await fetchInitialData();
      } catch (fetchError) {
        console.error(
          'Error fetching data after VPN toggle error:',
          fetchError
        );
        // Ignore errors here, we've already shown an error toast
      }
    }
  };

  const handleServerSelected = async () => {
    navigateBack(); // Navigate back to main view
    setIsLoading(true);

    try {
      // Show loading toast
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: 'Updating server information...',
      });

      // Wait a moment for server selection to take effect
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Poll for status changes with increased attempts and timeout
      let attempts = 0;
      const maxAttempts = 15; // Increased from 10
      let updated = false;

      while (attempts < maxAttempts && !updated) {
        attempts++;

        try {
          console.log(
            `Checking server status (attempt ${attempts}/${maxAttempts})...`
          );

          // Check current status
          const status = await checkVpnStatus();

          // Check if we got valid server info
          if (
            status.serverCity &&
            status.serverCity !== 'Unknown' &&
            status.serverCountry &&
            status.serverCountry !== 'Unknown'
          ) {
            console.log(
              `Server info found: ${status.serverCity}, ${status.serverCountry}`
            );

            // Update UI with new server info
            setVpnStatus(status.isActive);
            setServerCity(status.serverCity);
            setServerCountry(status.serverCountry);

            // If we're connected, update IP too
            if (status.isActive) {
              try {
                const newIp = await fetchCurrentIP();
                setCurrentIP(newIp);
              } catch (ipError) {
                console.error(
                  'Error updating IP after server change:',
                  ipError
                );
                // Don't fail the whole operation for this
              }
            }

            updated = true;
            loadingToast.style = Toast.Style.Success;
            loadingToast.title = `Server location set to ${status.serverCity}, ${status.serverCountry}`;
          } else {
            // Wait before trying again
            console.log('Server info not available yet, waiting...');
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Increased wait time
          }
        } catch (error) {
          console.error('Error checking status during polling:', error);
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Increased wait time
        }
      }

      // If we couldn't get status updates through polling, try once more with different approach
      if (!updated) {
        console.log('Polling exhausted, trying direct fetch...');

        try {
          await fetchInitialData();
          loadingToast.style = Toast.Style.Success;
          loadingToast.title = 'Server updated';
        } catch (fetchError) {
          console.error('Direct fetch failed:', fetchError);
          loadingToast.style = Toast.Style.Failure;
          loadingToast.title = "Couldn't verify server update";
        }
      }
    } catch (error) {
      console.error('Error refreshing data after server selection:', error);
      await showToast(Toast.Style.Failure, 'Failed to refresh VPN data');

      // Try once more to get the current status
      try {
        await fetchInitialData();
      } catch {
        // Ignore errors here, we've already shown an error toast
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInitialData = async () => {
    // Track what fails for better error messages
    let statusFailed = false;
    let ipFailed = false;

    try {
      // First check VPN status - this is the most important
      try {
        console.log('Fetching VPN status...');
        const { isActive, serverCity, serverCountry, isAuthenticated } =
          await checkVpnStatus();
        console.log(
          `VPN status retrieved: active=${isActive}, city=${serverCity}, country=${serverCountry}, auth=${isAuthenticated}`
        );

        setVpnStatus(isActive);
        setServerCity(serverCity || 'Unknown');
        setServerCountry(serverCountry || 'Unknown');
        setIsAuthenticated(isAuthenticated);
        setAuthCheckLoading(false);
        setErrorMessage(null); // Clear any previous error messages
      } catch (statusError) {
        console.error('Error fetching VPN status:', statusError);
        statusFailed = true;
        // Don't throw here, try to get IP at least
      }

      // Then get IP info - wait a bit if VPN status was successful to let network stabilize
      try {
        if (!statusFailed && vpnStatus !== null) {
          // If VPN is active, wait a bit longer for the connection to stabilize
          const waitTime = vpnStatus ? 2000 : 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }

        console.log('Fetching IP information...');
        const ip = await fetchCurrentIP();
        console.log(`IP information retrieved: ${ip}`);
        setCurrentIP(ip);
      } catch (ipError) {
        console.error('Error fetching IP:', ipError);
        ipFailed = true;
        setCurrentIP('IP information unavailable');
      }

      // Show appropriate error messages
      if (statusFailed && ipFailed) {
        await showToast(
          Toast.Style.Failure,
          'Failed to fetch VPN status and IP information.'
        );
        setErrorMessage('Failed to fetch data. Please try again.');
      } else if (statusFailed) {
        await showToast(Toast.Style.Failure, 'Failed to fetch VPN status.');
      } else if (ipFailed) {
        await showToast(Toast.Style.Failure, 'Failed to fetch IP information.');
      }
    } catch (error: unknown) {
      // This is a fallback for any unexpected errors
      console.error('Unexpected error in fetchInitialData:', error);
      await showToast(Toast.Style.Failure, 'Failed to fetch data.');
      setCurrentIP('Unavailable');
      setServerCity('Unavailable');
      setServerCountry('Unavailable');
      setAuthCheckLoading(false);
      setErrorMessage('Failed to fetch data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let initTimeoutId: NodeJS.Timeout | null = null;

    const initializeExtension = async () => {
      if (isMozillaVPNInstalled()) {
        try {
          setErrorMessage(null); // Clear previous error
          await fetchInitialData();

          // Clear the timeout since initialization completed successfully
          if (initTimeoutId) {
            clearTimeout(initTimeoutId);
            initTimeoutId = null;
          }
        } catch (error) {
          console.error('Error during initialization:', error);
          setErrorMessage('Failed to initialize. Please try again.');
          setIsLoading(false);
        }
      } else {
        setIsLoading(false); // Stop loading if Mozilla VPN is not installed
        setErrorMessage('Mozilla VPN application is not installed.');
      }
    };

    // Set a longer timeout for initialization to prevent hanging
    initTimeoutId = setTimeout(() => {
      console.error('Initialization timed out');
      setIsLoading(false);

      // Don't set error if we're already showing a more specific error
      if (!errorMessage) {
        setErrorMessage(
          'Initialization timed out. Try refreshing the extension.'
        );
      }
    }, 30000); // 30 seconds timeout (increased from 15s)

    initializeExtension();

    // Cleanup
    return () => {
      if (initTimeoutId) {
        clearTimeout(initTimeoutId);
      }
    };
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      await fetchInitialData();
      await showToast(Toast.Style.Success, 'Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      showToast(Toast.Style.Failure, 'Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (errorMessage) {
    return (
      <List>
        <List.EmptyView
          title="Mozilla VPN Error"
          description={errorMessage}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser
                  url="https://www.mozilla.org/en-US/products/vpn/download/"
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title="Download Mozilla VPN"
                />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action
                  title="Back"
                  icon={Icon.ArrowLeft}
                  onAction={navigateBack}
                  shortcut={{ modifiers: ['cmd'], key: 'b' }}
                />
              </ActionPanel.Section>
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
        <CheckLogin onBack={navigateBack} />
      </List>
    );
  }

  // Render different views based on currentView state
  switch (currentView) {
    case 'serverSelector':
      return (
        <ServerSelector
          onServerSelected={handleServerSelected}
          onBack={navigateBack}
        />
      );

    case 'serverDetails':
      return (
        <ServerDetails
          serverCity={serverCity || 'Unknown'}
          serverCountry={serverCountry || 'Unknown'}
          ipAddress={currentIP || 'Unknown'}
          isConnected={vpnStatus || false}
          onToggleVpn={toggleVpn}
          onSelectServer={() => navigateTo('serverSelector')}
          onBack={navigateBack}
        />
      );

    case 'main':
    default:
      return (
        <List isLoading={isLoading} navigationTitle="Mozilla VPN Connect">
          <List.Section title="VPN Controls">
            <VpnStatus
              vpnStatus={vpnStatus}
              serverCity={serverCity}
              serverCountry={serverCountry}
              onToggleVpn={toggleVpn}
              onSelectServer={() => navigateTo('serverSelector')}
            />
          </List.Section>

          <List.Section title="Information">
            <List.Item
              title="Current IP Address and Location"
              subtitle={currentIP}
              icon={{ source: Icon.Network }}
              actions={
                <ActionPanel>
                  <Action
                    // eslint-disable-next-line @raycast/prefer-title-case
                    title="Refresh IP and Location"
                    icon={Icon.RotateClockwise}
                    onAction={async () => {
                      await showToast(
                        Toast.Style.Animated,
                        'Refreshing IP information...'
                      );
                      try {
                        const ip = await fetchCurrentIP();
                        setCurrentIP(ip);
                        await showToast(
                          Toast.Style.Success,
                          'IP information updated'
                        );
                      } catch (error) {
                        const errorMessage =
                          error instanceof Error
                            ? error.message
                            : 'Unknown error occurred';
                        await showToast(
                          Toast.Style.Failure,
                          'Failed to update IP information',
                          errorMessage
                        );
                      }
                    }}
                  />
                </ActionPanel>
              }
            />

            <List.Item
              title="View Detailed VPN Status"
              icon={{ source: Icon.Sidebar }}
              accessories={[{ icon: Icon.Eye }]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Vpn Details"
                    icon={Icon.Sidebar}
                    onAction={() => navigateTo('serverDetails')}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Actions">
            <List.Item
              title="Change VPN Server"
              icon={{ source: Icon.Globe }}
              actions={
                <ActionPanel>
                  <Action
                    title="Select New Server"
                    icon={Icon.Globe}
                    onAction={() => navigateTo('serverSelector')}
                  />
                </ActionPanel>
              }
            />

            <List.Item
              title="Refresh VPN Status"
              icon={{ source: Icon.RotateClockwise }}
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh Data"
                    icon={Icon.RotateClockwise}
                    onAction={refreshData}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
        </List>
      );
  }
};

export default Command;
