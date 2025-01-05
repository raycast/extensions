import { ActionPanel, Action, List, showToast, Toast, Form, useNavigation, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

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
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    LocalStorage.getItem<string>("ipinfo_api_token").then((storedToken) => {
      if (storedToken) {
        setToken(storedToken);
      }
    });
  }, []);

  async function handleSubmit() {
    if (!/^[0-9a-fA-F]{10,}$/.test(token)) {
      setError("Please enter a valid API token (at least 10 hexadecimal characters)");
      return;
    }
    await LocalStorage.setItem("ipinfo_api_token", token);
    showToast(Toast.Style.Success, "API token saved successfully");
    pop();
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
        title="IPInfo API Token"
        value={token}
        error={error}
        onChange={(value) => {
          setToken(value);
          setError(undefined);
        }}
      />
      <Form.Description
        title="How to get your API Token?"
        text="1. Visit https://ipinfo.io/account/token
2. Sign up or log in to your account
3. Copy your API token from the dashboard
4. Paste it here to start using the extension"
      />
      
      <Form.Description
        text="Need help? Visit https://ipinfo.io/account/token"
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
      const data = await response.json() as IPInfo;
      setIpInfo(data);
      showToast(Toast.Style.Success, "IP information fetched successfully");
    } catch (error) {
      console.error("Error fetching IP info:", error);
      showToast(Toast.Style.Failure, "Failed to fetch IP information");
    }
  }

  const isValidIP = (ip: string): boolean => {
    // IPv4 validation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
      const parts = ip.split('.');
      return parts.every(part => parseInt(part) >= 0 && parseInt(part) <= 255);
    }
    
    // IPv6 validation
    // 支持完整格式、压缩格式（::）和混合格式
    const ipv6Regex = /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    
    return ipv6Regex.test(ip);
  };

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter IPv4 or IPv6 address..."
      throttle
    >
      <List.Item
        title="Query IP Location"
        subtitle={searchText}
        actions={
          <ActionPanel>
            <Action
              title="Fetch IP Info"
              onAction={() => {
                if (!searchText) {
                  showToast(Toast.Style.Failure, "Please enter an IPv4 or IPv6 address");
                  return;
                }
                if (!isValidIP(searchText)) {
                  showToast(Toast.Style.Failure, "Invalid IPv4 or IPv6 address format");
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
        <List.Section title="IP information from IPInfo.io">
          <List.Item
            title="IP Address"
            subtitle={ipInfo.ip}
          />
          {ipInfo.hostname && (
            <List.Item
              title="Hostname"
              subtitle={ipInfo.hostname}
            />
          )}
          {ipInfo.city && ipInfo.region && ipInfo.country && (
            <List.Item
              title="Location"
              subtitle={`${ipInfo.city}, ${ipInfo.region}, ${ipInfo.country}`}
            />
          )}
          {ipInfo.loc && (
            <List.Item
              title="Coordinates"
              subtitle={ipInfo.loc}
            />
          )}
          {ipInfo.org && (
            <List.Item
              title="Organization"
              subtitle={ipInfo.org}
            />
          )}
          {ipInfo.postal && (
            <List.Item
              title="Postal Code"
              subtitle={ipInfo.postal}
            />
          )}
          {ipInfo.timezone && (
            <List.Item
              title="Timezone"
              subtitle={ipInfo.timezone}
            />
          )}
        </List.Section>
      )}
    </List>
  );
}
