import { ActionPanel, Action, List, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { PassboltClient } from "./lib/passbolt";
import { Resource } from "./types";
import { TOTP } from "otpauth";

interface TOTPResource extends Resource {
  totpSecret?: string;
  totpCode?: string;
  totpTimeRemaining?: number;
}

export default function Authenticator() {
  const [items, setItems] = useState<TOTPResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [client] = useState(() => new PassboltClient());
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update time every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchTOTPResources() {
      setIsLoading(true);
      try {
        // Fetch all resources
        const response = await client.searchResources("");
        if (response.body && Array.isArray(response.body)) {
          const totpResources: TOTPResource[] = [];
          const allResources = response.body;

          // Show toast with progress
          const toast = await showToast({
            style: Toast.Style.Animated,
            title: `Scanning ${allResources.length} resources for TOTP...`,
          });

          let processed = 0;

          // Process resources in batches to avoid overwhelming the system
          for (const resource of allResources) {
            try {
              processed++;

              // Update progress every 5 resources
              if (processed % 5 === 0) {
                toast.title = `Scanned ${processed}/${allResources.length} resources...`;
              }

              // Try to get the secret
              const secretRes = await client.getSecret(resource.id);
              if (secretRes && secretRes.data) {
                const decrypted = await client.decryptSecret(secretRes.data);

                // Try to parse as JSON to get TOTP secret
                try {
                  const secretData = JSON.parse(decrypted);
                  if (secretData.totp && secretData.totp.secret_key) {
                    totpResources.push({
                      ...resource,
                      totpSecret: secretData.totp.secret_key,
                    });

                    // Update toast when we find TOTP resources
                    toast.title = `Found ${totpResources.length} TOTP resources`;
                  }
                } catch {
                  // Not JSON or no TOTP, skip silently
                }
              }
            } catch {
              // Skip resources we can't decrypt - don't log to reduce noise
            }
          }

          setItems(totpResources);

          // Final toast
          toast.style = Toast.Style.Success;
          toast.title = `Found ${totpResources.length} TOTP resources`;
        } else {
          setItems([]);
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch TOTP resources",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchTOTPResources();
  }, [client]);

  // Generate TOTP codes for all items
  const itemsWithCodes = items.map((item) => {
    if (!item.totpSecret) return item;

    try {
      const totp = new TOTP({
        secret: item.totpSecret,
        digits: 6,
        period: 30,
      });

      const code = totp.generate();
      const timeRemaining = 30 - (Math.floor(currentTime / 1000) % 30);

      return {
        ...item,
        totpCode: code,
        totpTimeRemaining: timeRemaining,
      };
    } catch (error) {
      console.error(`Failed to generate TOTP for ${item.name}:`, error);
      return item;
    }
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search TOTP resources...">
      {itemsWithCodes.length === 0 && !isLoading && (
        <List.EmptyView
          title="No TOTP Resources Found"
          description="No resources with TOTP authenticator configured"
          icon={Icon.Lock}
        />
      )}
      {itemsWithCodes.map((item) => {
        const timeColor = !item.totpTimeRemaining
          ? Color.SecondaryText
          : item.totpTimeRemaining <= 5
            ? Color.Red
            : item.totpTimeRemaining <= 10
              ? Color.Orange
              : Color.Green;

        return (
          <List.Item
            key={item.id}
            title={item.name}
            subtitle={item.username}
            accessories={[
              {
                text: item.totpCode || "------",
                icon: Icon.Key,
              },
              {
                tag: {
                  value: `${item.totpTimeRemaining || 0}s`,
                  color: timeColor,
                },
              },
            ]}
            actions={
              <ActionPanel>
                {item.totpCode && (
                  <>
                    <Action.CopyToClipboard
                      title="Copy TOTP Code"
                      content={item.totpCode}
                      icon={Icon.Key}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.Paste
                      title="Paste TOTP Code"
                      content={item.totpCode}
                      icon={Icon.Key}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                    />
                  </>
                )}
                {item.username && (
                  <Action.CopyToClipboard title="Copy Username" content={item.username} icon={Icon.Person} />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
