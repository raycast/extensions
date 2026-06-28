import {
  Grid,
  showToast,
  ToastStyle,
  ActionPanel,
  useNavigation,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { Device, DeviceCategory } from "./types"; // Erstellen Sie diese Datei mit den entsprechenden Typdefinitionen

const ICON_URLS = {
  switch: "https://api.iconify.design/material-symbols/switch.svg",
  light: "https://api.iconify.design/iconoir/light-bulb.svg",
  motionsensor: "https://api.iconify.design/cbi/motionsensor.svg",
  mobilepresence: "https://api.iconify.design/foundation/mobile-signal.svg",
  remotecontroller: "https://api.iconify.design/ri/remote-control-line.svg",
  fan: "https://api.iconify.design/mdi/fan.svg",
  speaker: "https://api.iconify.design/material-symbols/speaker.svg",
  door: "https://api.iconify.design/ph/door-bold.svg",
  contactsensor: "https://api.iconify.design/cbi/aqara-contact.svg",
  smartplug: "https://api.iconify.design/ic/outline-power.svg",
  hub: "https://api.iconify.design/solar/smart-home-bold.svg",
  temphumiditysensor: "https://api.iconify.design/tabler/temperature-sun.svg",
  other:
    "https://api.iconify.design/material-symbols-light/devices-other-rounded.svg",
};

// Funktion, um die Icon-URL basierend auf der Kategorie und Größe zu erhalten
const getIconUrl = (category: DeviceCategory, size = 1): string => {
  if (!category) {
    console.warn("Category is undefined or null");
    return ICON_URLS["other"];
  }

  const lowerCategory: keyof typeof ICON_URLS =
    category.toLowerCase() as keyof typeof ICON_URLS;
  const iconUrl = ICON_URLS[lowerCategory] || ICON_URLS["other"];

  // Abfrageparameter anhängen, um das Bild zu skalieren
  const scaledUrl = `${iconUrl}?size=${size * 100}%`;

  console.log(`Icon URL for category '${category}': ${scaledUrl}`);

  return scaledUrl;
};

export default function ShowAllDevices() {
  const [devices, setDevices] = useState<Record<DeviceCategory, Device[]>>({});
  const [filteredDevices, setFilteredDevices] = useState<
    Record<DeviceCategory, Device[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  // Entfernen Sie die nicht verwendete Variable searchText
  // const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchDevices() {
      try {
        const preferences = getPreferenceValues();
        const SMARTTHINGS_API_TOKEN = preferences.apiToken; // Retrieve the API token from preferences
        // Entfernen Sie die nicht verwendete Variable SMARTTHINGS_LOCATION_ID

        const response = await axios.get(
          `https://api.smartthings.com/v1/devices`,
          {
            headers: {
              Authorization: `Bearer ${SMARTTHINGS_API_TOKEN}`,
            },
          },
        );

        const devicesData: Device[] = response.data.items;

        // Sort devices by the last updated timestamp in descending order
        devicesData.sort((a: Device, b: Device) => {
          const aTimestamp = new Date(
            a.components[0].capabilities[0].timestamp,
          ).getTime();
          const bTimestamp = new Date(
            b.components[0].capabilities[0].timestamp,
          ).getTime();
          return bTimestamp - aTimestamp;
        });

        // Categorize devices into groups based on categories
        const categorizedDevices = categorizeDevices(devicesData);

        // Sort categories based on the latest update date of devices within each category
        const sortedCategories = Object.keys(categorizedDevices).sort(
          (categoryA, categoryB) => {
            const latestDeviceA =
              categorizedDevices[categoryA as DeviceCategory][0];
            const latestDeviceB =
              categorizedDevices[categoryB as DeviceCategory][0];
            if (!latestDeviceA || !latestDeviceB) return 0;
            const timestampA = new Date(
              latestDeviceA.components[0].capabilities[0].timestamp,
            ).getTime();
            const timestampB = new Date(
              latestDeviceB.components[0].capabilities[0].timestamp,
            ).getTime();
            return timestampB - timestampA;
          },
        );

        // Prepare sorted categorized devices
        const sortedDevices: { [key: string]: any[] } = {}; // Add type annotation

        sortedCategories.forEach((category: string) => {
          sortedDevices[category] = (
            categorizedDevices as { [key: string]: any[] }
          )[category];
        });

        setDevices(sortedDevices as any);
        setFilteredDevices(sortedDevices as any);
        setIsLoading(false);
      } catch (error) {
        showToast(
          ToastStyle.Failure,
          "Failed to fetch devices",
          (error as Error).message,
        );
        setIsLoading(false);
      }
    }

    fetchDevices();
  }, []); // Empty dependency array ensures this effect runs only once after initial render

  // Function to categorize devices based on their categories
  const categorizeDevices = (
    devices: Device[],
  ): Record<DeviceCategory, Device[]> => {
    const categorized = {};

    devices.forEach((device: Device) => {
      device.components.forEach((component: any) => {
        component.categories.forEach((category: any) => {
          if (!(category.name in categorized)) {
            (categorized as { [key: string]: any[] })[category.name] = [];
          }
          (categorized as { [key: string]: any[] })[category.name].push(device);
        });
      });
    });

    return categorized;
  };

  // Function to filter devices based on search text
  const filterDevices = (text: string): void => {
    if (!text.trim()) {
      setFilteredDevices(devices);
      return;
    }

    const lowerText = text.trim().toLowerCase();
    const filtered = {};

    Object.keys(devices).forEach((category: string) => {
      const filteredCategoryDevices = devices[category].filter(
        (device: Device) =>
          (device.label && device.label.toLowerCase().includes(lowerText)) ||
          device.components.some((component: any) =>
            component.categories.some((category: any) =>
              category.name.toLowerCase().includes(lowerText),
            ),
          ),
      );

      if (filteredCategoryDevices.length > 0) {
        (filtered as { [key: string]: any[] })[category] =
          filteredCategoryDevices;
      }
    });

    setFilteredDevices(filtered as any);
  };

  // Aktualisieren Sie die handleSearchTextChange Funktion
  const handleSearchTextChange = (text: string): void => {
    // Entfernen Sie setSearchText(text);
    filterDevices(text);
  };

  // Function to handle device selection and navigation
  const handleDeviceSelection = (deviceId: string): void => {
    const device = Object.values(devices)
      .flat()
      .find((device: Device) => device.deviceId === deviceId);
    if (device) {
      push(<DeviceDetail device={device} />);
    }
  };

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder="Search Devices and Groups"
      onSearchTextChange={handleSearchTextChange}
      aspectRatio="16/9"
      itemSize={Grid.ItemSize.Small}
    >
      {Object.entries(filteredDevices).map(([category, categoryDevices]) => (
        <Grid.Section key={category} title={category}>
          {categoryDevices.map((device: Device) => (
            <Grid.Item
              key={device.deviceId}
              title={device.label || "Unnamed Device"}
              subtitle={device.deviceTypeName}
              content={{ source: getIconUrl(category as DeviceCategory, 0.75) }} // Scale the icon to 75% of original size
              actions={
                <ActionPanel>
                  <ActionPanel.Item
                    title="Show Details"
                    onAction={() => handleDeviceSelection(device.deviceId)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
      {Object.keys(filteredDevices).length === 0 && !isLoading && (
        <Grid.Item
          title="No Devices Found"
          content={{
            source: "https://api.iconify.design/material-symbols/lightbulb.svg",
          }} // Custom icon URL for "No Devices Found"
          subtitle="No devices match your search."
        />
      )}
    </Grid>
  );
}

// Komponente zum Anzeigen der Gerätedetails
function DetailComponent({ device }: { device: Device }) {
  return (
    <Grid.Item
      title={device.label || "Unnamed Device"}
      subtitle={device.deviceTypeName}
      content={{ source: getIconUrl(device.deviceTypeName, 0.75) }} // Icon für Detailansicht hinzufügen
    />
  );
}

// Komponente zum Rendern der Gerätedetailansicht
function DeviceDetail({ device }: { device: Device }) {
  return (
    <Grid>
      <Grid.Section>
        <DetailComponent device={device} />
      </Grid.Section>
    </Grid>
  );
}
