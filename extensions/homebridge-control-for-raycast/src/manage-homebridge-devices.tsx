import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import axios, { AxiosResponse } from "axios";
import { Accessory } from "./types";

// Map accessory types to icons
const accessoryIcons: { [key: string]: Icon } = {
  Lightbulb: Icon.LightBulbOff,
  Switch: Icon.Switch,
  Outlet: Icon.Plug,
  TemperatureSensor: Icon.Temperature,
  BatterySensor: Icon.Battery,
  HumiditySensor: Icon.Humidity,
  Default: Icon.Circle,
};

interface Preferences {
  url: string;
  username: string;
  password: string;
}

interface CustomError {
  message: string;
  code?: number;
  response?: {
    status: number;
  };
  stack?: string;
}

interface Accessory {
  uniqueId: string;
  serviceName: string;
  humanType: string;
  serviceCharacteristics: { type: string; value: boolean | number | string }[];
}

interface LoginResponse {
  access_token: string;
  expires_in: number;
}

export default function Command() {
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const { pop } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();

  // Clean up the URL by removing any trailing slash
  const baseUrl = preferences.url.endsWith("/") ? preferences.url.slice(0, -1) : preferences.url;

  useEffect(() => {
    const { username, password } = preferences;
    if (baseUrl && username && password) {
      void authenticateAndFetchAccessories(baseUrl, username, password);
    }
  }, [baseUrl, preferences.username, preferences.password]);

  async function authenticateAndFetchAccessories(url: string, username: string, password: string) {
    try {
      const token = await getStoredToken();
      if (token) {
        fetchAccessories(url);
      } else {
        const { access_token: token, expires_in: expiresIn } = await login(url, username, password);

        const expirationTime = Date.now() + expiresIn * 1000;
        await LocalStorage.setItem("HOMEBRIDGE_JWT_TOKEN", token);
        await LocalStorage.setItem("HOMEBRIDGE_TOKEN_EXPIRATION", expirationTime.toString());

        showToast(Toast.Style.Success, "Authenticated");
        fetchAccessories(url);
      }
    } catch (error) {
      handleError(error as CustomError, "Authentication Failed", "Please check your username, password, or URL.");
      openExtensionPreferences();
    }
  }

  async function login(url: string, username: string, password: string): Promise<LoginResponse> {
    const response = await axios.post<LoginResponse, AxiosResponse>(
      `${url}/api/auth/login`,
      { username, password },
      { headers: { "Content-Type": "application/json", Accept: "application/json, text/plain, */*" } },
    );
    return response.data;
  }

  async function getStoredToken(): Promise<string | null> {
    const token = await LocalStorage.getItem<string>("HOMEBRIDGE_JWT_TOKEN");
    const expiration = await LocalStorage.getItem<string>("HOMEBRIDGE_TOKEN_EXPIRATION");

    if (token && expiration) {
      const expirationTime = parseInt(expiration, 10);
      if (Date.now() < expirationTime) {
        return token;
      }
    }
    return null;
  }

  async function fetchAccessories(url: string) {
    try {
      const token = await getStoredToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const favoritesString = await LocalStorage.getItem<string>("HOMEBRIDGE_FAVORITES");
      const favorites = favoritesString ? JSON.parse(favoritesString) : [];

      setFavorites(favorites);

      const response = await axios.get<Accessory[], AxiosResponse>(`${url}/api/accessories`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAccessories(response.data);
    } catch (error) {
      handleError(error as CustomError, "Failed to fetch accessories");
    }
  }

  function handleError(error: CustomError, defaultMessage: string, detailedMessage?: string) {
    const message = detailedMessage || error.message;
    showToast(Toast.Style.Failure, defaultMessage, message);
  }

  async function toggleAccessoryState(accessory: Accessory, characteristicType: string) {
    try {
      const token = await getStoredToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const newState = !accessory.serviceCharacteristics.find((char) => char.type === characteristicType)?.value;

      await axios.put(
        `${baseUrl}/api/accessories/${accessory.uniqueId}`,
        { characteristicType, value: newState },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      await showToast(Toast.Style.Success, `Accessory ${newState ? "turned on" : "turned off"}`);
      await fetchAccessories(baseUrl);
    } catch (error) {
      handleError(error as CustomError, `Failed to toggle accessory`);
    }
  }

  async function handleBrightnessSubmit({ brightness, accessory }: { brightness: string; accessory: Accessory }) {
    try {
      const token = await getStoredToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      await axios.put(
        `${baseUrl}/api/accessories/${accessory.uniqueId}`,
        { characteristicType: "Brightness", value: parseInt(brightness) },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // turn it on if its off
      if (!accessory.serviceCharacteristics.find((char) => char.type === "On")?.value) {
        await toggleAccessoryState(accessory, "On");
      }

      showToast(Toast.Style.Success, `Brightness set to ${brightness}`);
      await fetchAccessories(baseUrl);
      pop();
    } catch (error) {
      handleError(error as CustomError, "Failed to set brightness");
    }
  }

  async function toggleFavorite(uniqueId: string) {
    const updatedFavorites = favorites.includes(uniqueId)
      ? favorites.filter((id) => id !== uniqueId)
      : [...favorites, uniqueId];

    await LocalStorage.setItem("HOMEBRIDGE_FAVORITES", JSON.stringify(updatedFavorites));
    setFavorites(updatedFavorites);
    showToast(Toast.Style.Success, favorites.includes(uniqueId) ? "Removed from favorites" : "Added to favorites");
  }

  function renderAccessoryControls(accessory: Accessory) {
    const isFavorite = favorites.includes(accessory.uniqueId);

    return (
      <ActionPanel>
        {renderSpecificAccessoryControl(accessory)}
        {accessory.serviceCharacteristics.find((char) => char.type === "On") && (
          <Action
            title={accessory.serviceCharacteristics.find((char) => char.type === "On")?.value ? "Turn Off" : "Turn On"}
            onAction={() => toggleAccessoryState(accessory, "On")}
          />
        )}
        <Action
          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          onAction={() => toggleFavorite(accessory.uniqueId)}
        />
        <Action title="View Settings" icon={Icon.Cog} onAction={openExtensionPreferences} />
      </ActionPanel>
    );
  }

  function renderSpecificAccessoryControl(accessory: Accessory) {
    switch (accessory.humanType) {
      case "Lightbulb":
        return renderLightbulbControl(accessory);
      default:
        return null;
    }
  }

  function renderLightbulbControl(accessory: Accessory) {
    const isOn = Boolean(accessory.serviceCharacteristics.find((char) => char.type === "On")?.value);
    const brightness = accessory.serviceCharacteristics.find((char) => char.type === "Brightness")?.value;

    return (
      <ActionPanel.Section>
        <Action title={isOn ? "Turn Off" : "Turn On"} onAction={() => toggleAccessoryState(accessory, "On")} />
        {brightness !== null && (
          <>
            <Action title="20% Brightness" onAction={() => handleBrightnessSubmit({ brightness: "25", accessory })} />
            <Action title="40% Brightness" onAction={() => handleBrightnessSubmit({ brightness: "50", accessory })} />
            <Action title="60% Brightness" onAction={() => handleBrightnessSubmit({ brightness: "75", accessory })} />
            <Action title="80% Brightness" onAction={() => handleBrightnessSubmit({ brightness: "100", accessory })} />
            <Action title="100% Brightness" onAction={() => handleBrightnessSubmit({ brightness: "100", accessory })} />
            <Action.Push
              title="Adjust Brightness"
              target={
                <BrightnessForm
                  accessory={accessory}
                  handleSubmit={(values) =>
                    handleBrightnessSubmit({
                      brightness: values.brightness,
                      accessory,
                    })
                  }
                />
              }
            />
          </>
        )}
      </ActionPanel.Section>
    );
  }

  function AccessoryListItem({ accessory }: { accessory: Accessory }) {
    // Remove key from the props here
    const isOn = accessory.serviceCharacteristics.find((char) => char.type === "On")?.value;
    const brightness = accessory.serviceCharacteristics.find((char) => char.type === "Brightness")?.value;
    const formattedText =
      accessory.humanType === "Lightbulb"
        ? `Brightness: ${brightness}`
        : accessory.serviceCharacteristics.map((char) => `${char.type}: ${char.value}`).join(", ");
    let icon = accessoryIcons[accessory.humanType] || accessoryIcons.Default;

    if (accessory.humanType === "Lightbulb") {
      icon = isOn ? Icon.LightBulb : Icon.LightBulbOff;
    }

    return (
      <List.Item
        title={accessory.serviceName}
        subtitle={accessory.humanType}
        icon={icon}
        accessories={[{ text: formattedText }]}
        actions={renderAccessoryControls(accessory)}
      />
    );
  }

  function renderFavoritesSection() {
    const favoriteAccessories = accessories.filter((accessory) => favorites.includes(accessory.uniqueId));

    if (!favoriteAccessories.length) return null;

    return (
      <List.Section title="Favorites">
        {favoriteAccessories.map((accessory) => (
          <AccessoryListItem key={accessory.uniqueId} accessory={accessory} />
        ))}
      </List.Section>
    );
  }

  function renderAllAccessoriesSection() {
    return (
      <List.Section title="All Accessories">
        {accessories.map((accessory) => (
          <AccessoryListItem key={accessory.uniqueId} accessory={accessory} />
        ))}
      </List.Section>
    );
  }

  return (
    <List isLoading={!accessories.length}>
      {renderFavoritesSection()}
      {renderAllAccessoriesSection()}
    </List>
  );
}

function BrightnessForm({
  accessory,
  handleSubmit,
}: {
  accessory: Accessory;
  handleSubmit: (values: { brightness: string }) => void;
}) {
  const brightnessChar = accessory.serviceCharacteristics.find((char) => char.type === "Brightness");
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Brightness" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="brightness"
        title="Brightness"
        placeholder="Enter brightness level (0-100)"
        defaultValue={brightnessChar?.value.toString() ?? ""}
      />
    </Form>
  );
}
