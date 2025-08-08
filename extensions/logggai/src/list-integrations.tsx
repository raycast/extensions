// list-integrations.tsx
import { List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

interface Integration {
  platform: string;
  name: string;
  isConnected: boolean;
  type: string;
}

export default function Command() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { "Session Token": sessionToken } = getPreferenceValues();

  useEffect(() => {
    async function fetchIntegrations() {
      try {
        const res = await fetch("https://logggai.run/api/integrations", {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        const data = (await res.json()) as { integrations?: Integration[] };
        setIntegrations(data.integrations || []);
      } catch {
        showToast({ style: Toast.Style.Failure, title: "Failed to fetch integrations" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchIntegrations();
  }, [sessionToken]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search integrations...">
      {integrations.map((integration) => (
        <List.Item
          key={integration.platform}
          title={integration.name}
          subtitle={integration.isConnected ? "Connected" : "Not connected"}
        />
      ))}
    </List>
  );
}
