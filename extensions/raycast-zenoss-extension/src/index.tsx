import {
  List,
  Detail,
  getPreferenceValues,
  showToast,
  Toast,
  ActionPanel,
  Action,
  Color,
} from '@raycast/api';
import { useEffect, useState } from 'react';
import axios from 'axios';
import https from 'https';

// Define the types for your Zenoss API response based on device.go
interface ZenossDevice {
  name?: string;
  uid?: string;
  productionState?: number;
  systems?: Array<{ uid?: string; name?: string; path?: string; uuid?: string }>;
  groups?: Array<{ uid?: string; name?: string; path?: string; uuid?: string }>;
  collector?: string;
  ipAddress?: number;
  ipAddressString?: string;
  serialNumber?: string;
  pythonClass?: string;
  hwManufacturer?: { uid?: string; name?: string };
  osModel?: { uid?: string; name?: string };
  priority?: number;
  hwModel?: { uid?: string; name?: string };
  tagNumber?: string;
  osManufacturer?: { uid?: string; name?: string };
  location?: any; // Can be null or object
  events?: {
    clear?: { acknowledged_count?: number; count?: number };
    critical?: { acknowledged_count?: number; count?: number };
    error?: { acknowledged_count?: number; count?: number };
    warning?: { acknowledged_count?: number; count?: number };
    info?: { acknowledged_count?: number; count?: number };
    debug?: { acknowledged_count?: number; count?: number };
  };
}

interface ZenossApiResponse {
  uuid: string;
  action: string;
  result: {
    totalCount: number;
    hash: string;
    success: boolean;
    devices: ZenossDevice[];
  };
  tid: number;
  type: string;
  method: string;
}

// Raycast preferences type
interface Preferences {
  zenossUrl: string;
  zenossUsername: string;
  zenossPassword?: string;
}

// Mapping for production states
const prodStates: { [key: number]: string } = {
  '-1': 'Decommissioned',
  '100': 'Disabled',
  '300': 'Maintenance',
  '400': 'Test',
  '500': 'Pre-Production',
  '600': 'Migrated',
  '900': 'Customer-Only',
  '1000': 'Production',
};

// Helper function to get production state string
function getProductionStateString(state: number | undefined): string {
  if (typeof state === 'number' && prodStates[state]) {
    return prodStates[state];
  }
  return 'N/A';
}

// Helper component to display device details
function DeviceDetailView(props: { device: ZenossDevice }) {
  const { device } = props;

  // IMPORTANT: If you filter keys in the API call, some fields might be undefined here.
  // Ensure all fields you want to display in the DetailView are requested via 'Keys'
  // or handle them as optional (e.g., device.collector || 'N/A').
  const markdownContent = `
# Device Details: ${device.name || 'N/A'}

## Basic Info
* **Name:** ${device.name || 'N/A'}
* **UID:** ${device.uid || 'N/A'}
* **IP Address:** ${device.ipAddressString || 'N/A'}
* **Collector:** ${device.collector || 'N/A'}
* **Production State:** ${getProductionStateString(device.productionState)}
* **Priority:** ${device.priority || 'N/A'}
* **Python Class:** ${device.pythonClass || 'N/A'}
* **Serial Number:** ${device.serialNumber || 'N/A'}
* **Tag Number:** ${device.tagNumber || 'N/A'}
* **Location:** ${device.location ? JSON.stringify(device.location, null, 2) : 'N/A'}

## Hardware/OS
* **HW Manufacturer:** ${device.hwManufacturer?.name || 'N/A'}
* **HW Model:** ${device.hwModel?.name || 'N/A'}
* **OS Manufacturer:** ${device.osManufacturer?.name || 'N/A'}
* **OS Model:** ${device.osModel?.name || 'N/A'}

## Systems & Groups
* **Systems:** ${device.systems && device.systems.length > 0 ? device.systems.map((s) => s.name).join(', ') : 'N/A'}
* **Groups:** ${device.groups && device.groups.length > 0 ? device.groups.map((g) => g.name).join(', ') : 'N/A'}

## Event Summary
* **Clear:** ${device.events?.clear?.count || 0} (Acknowledged: ${device.events?.clear?.acknowledged_count || 0})
* **Critical:** ${device.events?.critical?.count || 0} (Acknowledged: ${device.events?.critical?.acknowledged_count || 0})
* **Error:** ${device.events?.error?.count || 0} (Acknowledged: ${device.events?.error?.acknowledged_count || 0})
* **Warning:** ${device.events?.warning?.count || 0} (Acknowledged: ${device.events?.warning?.acknowledged_count || 0})
* **Info:** ${device.events?.info?.count || 0} (Acknowledged: ${device.events?.info?.acknowledged_count || 0})
* **Debug:** ${device.events?.debug?.count || 0} (Acknowledged: ${device.events?.debug?.acknowledged_count || 0})
  `;

  return (
    <Detail markdown={markdownContent} navigationTitle={`Zenoss Device: ${device.name || 'N/A'}`} />
  );
}

export default function SearchZenossDevice() {
  const { zenossUrl, zenossUsername, zenossPassword } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState<string>('');
  const [devices, setDevices] = useState<ZenossDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDevices() {
      setIsLoading(true);
      setError(null);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Searching for "${searchText}"...`,
      });

      try {
        if (!zenossUrl || !zenossUsername || !zenossPassword) {
          throw new Error('Zenoss URL, Username, and Password must be set in preferences.');
        }

        const requestBody = {
          action: 'DeviceRouter',
          method: 'getDevices',
          data: [
            {
              uid: '/zport/dmd/Devices',
              params: {
                name: searchText, // Use searchText for dynamic filtering
              },
              start: 0,
              limit: 50,
              sort: 'name',
              dir: 'ASC',
              // --- ADDED KEYS ARRAY TO FILTER PROPERTIES ---
              keys: [
                'name',
                'uid',
                'ipAddressString',
                'productionState',
                'events', // Critical, Error, Warning counts are nested under events
                // Add any other top-level properties you need for the List.Item view
                // For the DetailView, you might need more keys, or fetch them in the DetailView itself.
              ],
              // --- END ADDED KEYS ARRAY ---
            },
          ],
          tid: 1,
          type: 'rpc',
        };

        const httpsAgent = new https.Agent({
          rejectUnauthorized: false, // WARNING: INSECURE - For local development/testing only
        });

        const response = await axios.post<ZenossApiResponse>(
          `${zenossUrl}/zport/dmd/device_router`,
          requestBody,
          {
            auth: {
              username: zenossUsername,
              password: zenossPassword,
            },
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            httpsAgent: httpsAgent,
          },
        );

        if (response.data.result.success && response.data.result.devices.length > 0) {
          setDevices(response.data.result.devices);
          toast.style = Toast.Style.Success;
          toast.title = 'Search Complete';
          toast.message = `Found ${response.data.result.devices.length} device(s).`;
        } else {
          setDevices([]); // Clear devices if no results
          toast.style = Toast.Style.Failure;
          toast.title = 'No Devices Found';
          setError(`No devices found matching "${searchText}".`);
          toast.message = `No devices found matching "${searchText}".`;
        }
      } catch (err: any) {
        toast.style = Toast.Style.Failure;
        toast.title = 'Error';
        let errorMessage = 'Failed to fetch devices.';
        if (axios.isAxiosError(err)) {
          console.error('Axios error:', err.response?.data || err.message);
          errorMessage = err.response?.data?.error?.message || err.message;
        } else {
          console.error('Unexpected error:', err);
          errorMessage = err.message || errorMessage;
        }
        setError(errorMessage);
        toast.message = errorMessage;
      } finally {
        setIsLoading(false);
      }
    }

    // Debounce the search to avoid too many API calls while typing
    const handler = setTimeout(() => {
      if (searchText.length > 0) {
        // Only search if there's text
        fetchDevices();
      } else {
        // If search text is empty, clear results and stop loading
        setDevices([]);
        setIsLoading(false);
        setError(null);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(handler); // Cleanup debounce timer
  }, [searchText, zenossUrl, zenossUsername, zenossPassword]); // Dependencies for useEffect

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Zenoss Hostname..."
      throttle={true} // Delay search until user stops typing
    >
      {error && <List.EmptyView title="Error" description={error} />}
      {!error && devices.length === 0 && !isLoading && searchText.length > 0 && (
        <List.EmptyView
          title="No Devices Found"
          description={`No devices matching "${searchText}".`}
        />
      )}
      {!error && devices.length === 0 && !isLoading && searchText.length === 0 && (
        <List.EmptyView
          title="Type to Search Zenoss Devices"
          icon={{ source: 'raycast-icon.png' }}
        /> // Placeholder when search bar is empty
      )}

      {devices.map((device) => {
        const warnCount =
          (device.events?.warning?.count || 0) + (device.events?.warning?.acknowledged_count || 0);
        const errorCount =
          (device.events?.error?.count || 0) + (device.events?.error?.acknowledged_count || 0);
        const criticalCount =
          (device.events?.critical?.count || 0) +
          (device.events?.critical?.acknowledged_count || 0);

        // Determine color for production state
        const productionStateColor = device.productionState === 1000 ? Color.Green : Color.Blue;

        return (
          <List.Item
            key={device.uid}
            title={device.name || 'Unknown Device'}
            subtitle={device.ipAddressString || 'No IP'}
            accessories={[
              {
                text: {
                  value: `Warn: ${warnCount}`,
                  color: warnCount > 0 ? Color.Yellow : Color.SecondaryText,
                },
              },
              {
                text: {
                  value: `Err: ${errorCount}`,
                  color: errorCount > 0 ? Color.Orange : Color.SecondaryText,
                },
              },
              {
                text: {
                  value: `Crit: ${criticalCount}`,
                  color: criticalCount > 0 ? Color.Red : Color.SecondaryText,
                },
              },
              {
                text: {
                  value: getProductionStateString(device.productionState),
                  color: productionStateColor,
                },
              }, // Dynamically set color
            ]}
            actions={
              <ActionPanel>
                {/* This Section groups the primary actions */}
                <ActionPanel.Section>
                  {device.uid && zenossUrl && (
                    <Action.OpenInBrowser
                      title="Open in Zenoss"
                      url={`${zenossUrl}${device.uid}/devicedetail#deviceDetailNav:device_overview`}
                    />
                  )}
                  <Action.Push
                    title="Show Details"
                    target={<DeviceDetailView device={device} />}
                    shortcut={{ modifiers: ['ctrl'], key: 'enter' }}
                  />
                </ActionPanel.Section>

                {/* This Section groups copy actions */}
                <ActionPanel.Section>
                  {device.uid && <Action.CopyToClipboard title="Copy UID" content={device.uid} />}
                  {device.ipAddressString && (
                    <Action.CopyToClipboard
                      title="Copy IP Address"
                      content={device.ipAddressString}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
