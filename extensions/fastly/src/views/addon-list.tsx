import { List, ActionPanel, Action, Icon, Color, showToast, Toast, Keyboard, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { FastlyService } from "../types";
import { isServiceProductEnabled, enableServiceProduct, disableServiceProduct } from "../api";

interface AddonListProps {
  service: FastlyService;
}

// Products manageable through the enabled-products/v1 API family.
// NGWAF is excluded: enabling it requires workspace configuration.
const PRODUCTS: Array<{ id: string; title: string; description: string }> = [
  { id: "bot_management", title: "Bot Management", description: "Detect and challenge bot traffic" },
  { id: "ddos_protection", title: "DDoS Protection", description: "Automatic attack detection and mitigation" },
  { id: "image_optimizer", title: "Image Optimizer", description: "Real-time image transformation at the edge" },
  { id: "brotli_compression", title: "Brotli Compression", description: "Compress responses with Brotli" },
  { id: "fanout", title: "Fanout", description: "Real-time push messaging (GRIP)" },
  { id: "websockets", title: "WebSockets", description: "WebSocket passthrough support" },
  { id: "origin_inspector", title: "Origin Inspector", description: "Detailed metrics about origin traffic" },
  { id: "domain_inspector", title: "Domain Inspector", description: "Detailed metrics per domain" },
  { id: "log_explorer_insights", title: "Log Explorer & Insights", description: "Store and query request logs" },
];

type AddonStatus = boolean | "unknown";

export function AddonList({ service }: AddonListProps) {
  const [statuses, setStatuses] = useState<Record<string, AddonStatus>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStatuses();
  }, []);

  async function loadStatuses() {
    setIsLoading(true);
    const entries = await Promise.all(
      PRODUCTS.map(async (product) => {
        try {
          return [product.id, await isServiceProductEnabled(product.id, service.id)] as const;
        } catch (error) {
          console.error(`Error checking ${product.id}:`, error);
          return [product.id, "unknown"] as const;
        }
      }),
    );
    setStatuses(Object.fromEntries(entries));
    setIsLoading(false);
  }

  async function handleToggle(product: (typeof PRODUCTS)[number], enabled: boolean) {
    const confirmed = await confirmAlert({
      title: enabled ? `Disable ${product.title}` : `Enable ${product.title}`,
      message: enabled
        ? `Disable ${product.title} on "${service.name}"? The product stops working on this service immediately.`
        : `Enable ${product.title} on "${service.name}"? Paid products may affect billing, and some require an entitlement on your account.`,
      primaryAction: enabled ? { title: "Disable", style: Alert.ActionStyle.Destructive } : { title: "Enable" },
    });
    if (!confirmed) {
      return;
    }
    try {
      if (enabled) {
        await disableServiceProduct(product.id, service.id);
      } else {
        await enableServiceProduct(product.id, service.id);
      }
      await showToast({
        style: Toast.Style.Success,
        title: `${product.title} ${enabled ? "disabled" : "enabled"}`,
        message: service.name,
      });
      // The outcome is known; no need to re-probe all nine products
      setStatuses((current) => ({ ...current, [product.id]: !enabled }));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to ${enabled ? "disable" : "enable"} ${product.title}`,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function statusAccessory(status: AddonStatus): List.Item.Accessory {
    if (status === true) return { tag: { value: "Enabled", color: Color.Green } };
    if (status === false) return { tag: { value: "Disabled", color: Color.SecondaryText } };
    return { tag: { value: "Unknown", color: Color.Orange }, tooltip: "Couldn't determine status" };
  }

  return (
    <List isLoading={isLoading} navigationTitle={`Add-Ons — ${service.name}`} searchBarPlaceholder="Search products...">
      {PRODUCTS.map((product) => {
        const status = statuses[product.id];
        return (
          <List.Item
            key={product.id}
            title={product.title}
            subtitle={product.description}
            icon={status === true ? { source: Icon.CheckCircle, tintColor: Color.Green } : { source: Icon.Circle }}
            accessories={[statusAccessory(status ?? "unknown")]}
            actions={
              <ActionPanel>
                {typeof status === "boolean" && (
                  <Action
                    title={status ? `Disable ${product.title}` : `Enable ${product.title}`}
                    icon={status ? Icon.XMarkCircle : Icon.CheckCircle}
                    style={status ? Action.Style.Destructive : undefined}
                    onAction={() => handleToggle(product, status)}
                  />
                )}
                <Action.CopyToClipboard title="Copy Service ID" content={service.id} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={loadStatuses}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
