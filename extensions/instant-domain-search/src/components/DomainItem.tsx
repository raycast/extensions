import { useMemo } from "react";
import type { DomainResult } from "../utils/types";
import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { ROOT_URL } from "../utils/config";

export default function DomainItem({ result }: { result: DomainResult }) {
  const defaultActionTitle = useMemo(() => {
    switch (result.availability) {
      case "aftermarket":
        return result.aftermarket?.current_price === undefined ? "Make Offer" : "Buy";
      case "taken":
        return "Lookup";
      default:
        return "Buy";
    }
  }, [result.availability]);
  const tag = useMemo(() => {
    switch (result.availability) {
      case "available":
        return "Available";
      case "taken":
        return "Taken";
      default:
        return "Available";
    }
  }, [result.availability]);
  const iconTintColor = useMemo(() => {
    switch (result.availability) {
      case "aftermarket":
        return "#3286DC";
      case "taken":
        return "oklch(55.48% 0.226 27.42)";
      default:
        return "oklch(66.98% 0.228 142.5)";
    }
  }, [result.availability]);
  const price = useMemo(() => {
    const currentPrice = result.aftermarket?.current_price;
    if (currentPrice) {
      return `$${currentPrice.toLocaleString()}`;
    }
    return undefined;
  }, [result.aftermarket?.current_price]);

  return (
    <List.Item
      icon={{
        source: Icon.Dot,
        tintColor: iconTintColor,
      }}
      title={result.domain}
      subtitle={price}
      accessories={[{ tag }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser icon={Icon.Cart} title={defaultActionTitle} url={result.backlink} />
          <Action.OpenInBrowser icon={Icon.MagnifyingGlass} title="Search" url={`${ROOT_URL}?q=${result.domain}`} />
          <Action.OpenInBrowser
            icon={Icon.Info}
            title="View Details"
            shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
            url={`${ROOT_URL}/domain/${result.domain}`}
          />
          <Action.CopyToClipboard title="Copy Domain to Clipboard" content={result.domain} />
          <Action.Paste title="Paste Domain" content={result.domain} />
        </ActionPanel>
      }
    />
  );
}
