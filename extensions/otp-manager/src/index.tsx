import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { loadOTPConfigs, removeOTPConfig } from "./utils/storage";
import { useOTP } from "./hooks/useOTP";
import { OTPConfig } from "./types";

export default function Command() {
  const [configs, setConfigs] = useState<OTPConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load configurations on startup
  useEffect(() => {
    const loadConfigs = async () => {
      const loadedConfigs = await loadOTPConfigs();
      setConfigs(loadedConfigs);
      setIsLoading(false);
    };

    loadConfigs();
  }, []);

  // Handle the deletion of a configuration
  const handleRemove = async (id: string) => {
    try {
      await removeOTPConfig(id);
      setConfigs(configs.filter((config) => config.id !== id));

      showToast({
        style: Toast.Style.Success,
        title: "Code Deleted",
        message: "The OTP code has been successfully deleted",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Could not delete the OTP code",
      });
    }
  };

  return (
    <List isLoading={isLoading}>
      {configs.map((config) => (
        <OTPListItem key={config.id} config={config} onRemove={handleRemove} />
      ))}
    </List>
  );
}

function OTPListItem({
  config,
  onRemove,
}: {
  config: OTPConfig;
  onRemove: (id: string) => Promise<void>;
}) {
  const { code, remaining } = useOTP(config);
  const progress = (remaining / config.period) * 100;

  return (
    <List.Item
      title={config.name}
      subtitle={code}
      icon={{ source: Icon.Key, tintColor: Color.Purple }}
      accessories={[
        { tag: { value: config.issuer || "", color: Color.SecondaryText } },
        { text: `${remaining}s` },
        {
          icon: {
            source: Icon.Circle,
            tintColor: progress < 25 ? Color.Red : Color.Green,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Paste
            title="Insert Code"
            content={code}
            shortcut={{ modifiers: [], key: "return" }}
          />
          <Action.CopyToClipboard
            title="Copy Code"
            content={code}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action title="Delete" icon={Icon.Trash} onAction={() => onRemove(config.id)} />
        </ActionPanel>
      }
    />
  );
}
