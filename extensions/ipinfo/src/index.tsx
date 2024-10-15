import { ActionPanel, Action, List, showToast, Toast, Form, useNavigation, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

// Define the IPInfo interface
interface IPInfo {
  ip: string;
  hostname?: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  org?: string;
  postal?: string;
  timezone?: string;
}

function TokenForm() {
  const { pop } = useNavigation();
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    LocalStorage.getItem<string>("ipinfo_api_token").then((storedToken) => {
      if (storedToken) {
        setToken("*".repeat(14));
      }
    });
  }, []);

  async function handleSubmit() {
    if (token && token !== "*".repeat(14)) {
      await LocalStorage.setItem("ipinfo_api_token", token);
      showToast(Toast.Style.Success, "API token saved successfully");
      pop();
    } else {
      showToast(Toast.Style.Failure, "Please enter a valid API token");
    }
  }

  function handleTokenChange(newToken: string) {
    if (newToken.length == 14) {
      setToken(newToken);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save API Token" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.PasswordField
        id="token"
        title="https://ipinfo.io API Token: "
        value={token}
        onChange={handleTokenChange}
      />
    </Form>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [ipInfo, setIpInfo] = useState<IPInfo | null>(null);
  const [apiToken, setApiToken] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    LocalStorage.getItem<string>("ipinfo_api_token").then((token) => {
      if (token) {
        setApiToken(token);
      } else {
        push(<TokenForm />);
      }
    });
  }, []);

  async function fetchIPInfo(ip: string) {
    if (!apiToken) {
      showToast(Toast.Style.Failure, "API token is missing");
      push(<TokenForm />);
      return;
    }

    try {
      const response = await fetch(`https://ipinfo.io/${ip}/json?token=${apiToken}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setIpInfo(data as IPInfo);
      showToast(Toast.Style.Success, "IP information fetched successfully");
    } catch (error) {
      console.error("Error fetching IP info:", error);
      showToast(Toast.Style.Failure, "Failed to fetch IP information");
    }
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter IP address..."
      throttle
    >
      <List.Item
        title="Query IP Information"
        subtitle={searchText}
        actions={
          <ActionPanel>
            <Action
              title="Fetch IP Info"
              onAction={() => {
                if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(searchText)) {
                  showToast(Toast.Style.Failure, "Invalid IP address format");
                  return;
                }
                fetchIPInfo(searchText);
              }}
            />
            <Action
              title="Set API Token"
              onAction={() => push(<TokenForm />)}
            />
          </ActionPanel>
        }
      />
      {ipInfo && (
        <List.Section title="IP Information">
          <List.Item title="IP Address" subtitle={ipInfo.ip} />
          <List.Item title="Hostname" subtitle={ipInfo.hostname} />
          <List.Item title="Location" subtitle={`${ipInfo.city}, ${ipInfo.region}, ${ipInfo.country}`} />
          <List.Item title="Coordinates" subtitle={ipInfo.loc} />
          <List.Item title="Organization" subtitle={ipInfo.org} />
          <List.Item title="Postal Code" subtitle={ipInfo.postal} />
          <List.Item title="Timezone" subtitle={ipInfo.timezone} />
        </List.Section>
      )}
    </List>
  );
}
