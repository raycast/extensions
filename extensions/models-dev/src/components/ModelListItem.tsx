import { List, Icon, Action } from "@raycast/api";
import type { ActionPanel } from "@raycast/api";
import { useMemo, memo } from "react";
import { Model } from "../lib/types";
import { formatPriceFixed } from "../lib/formatters";
import { ModelActions } from "./ModelActions";
import { STATUS_COLORS } from "../lib/constants";
import { getCapabilityAccessories } from "../lib/accessories";

type ActionPanelChildren = Parameters<typeof ActionPanel>[0]["children"];

interface ModelListItemProps {
  model: Model;
  onAddToComparison?: (model: Model) => void;
  canAddToComparison?: boolean;
  primaryAction?: ActionPanelChildren;
  extraActions?: ActionPanelChildren;
}

export const ModelListItem = memo(function ModelListItem({
  model,
  onAddToComparison,
  canAddToComparison,
  primaryAction,
  extraActions,
}: ModelListItemProps) {
  const accessories = useMemo(() => {
    const acc: List.Item.Accessory[] = [];

    // Status indicator (alpha, beta, deprecated)
    if (model.status) {
      acc.push({
        tag: {
          value: model.status,
          color: STATUS_COLORS[model.status],
        },
      });
    }

    // Capability icons
    acc.push(...getCapabilityAccessories(model));

    // Pricing (input / output)
    if (model.cost?.input !== undefined) {
      acc.push({
        text: formatPriceFixed(model.cost.input),
        tooltip: "Input price per 1M tokens",
      });
    }
    if (model.cost?.output !== undefined) {
      acc.push({
        text: formatPriceFixed(model.cost.output),
        tooltip: "Output price per 1M tokens",
      });
    }

    return acc;
  }, [model.status, model.reasoning, model.tool_call, model.modalities, model.cost?.input, model.cost?.output]);

  // Keywords for search — provider terms only.
  // Model name is already searchable via the title prop (fuzzy matched by Raycast).
  const keywords = useMemo(
    () => [model.providerId, model.providerName, model.family ?? ""].filter(Boolean),
    [model.providerId, model.providerName, model.family],
  );

  const defaultPrimaryAction = useMemo(() => {
    if (!onAddToComparison) return undefined;

    if (canAddToComparison === false) {
      return <Action.CopyToClipboard title="Copy Model ID" content={model.id} />;
    }

    return <Action title="Add to Comparison" icon={Icon.PlusCircle} onAction={() => onAddToComparison(model)} />;
  }, [onAddToComparison, canAddToComparison, model.id]);

  const resolvedPrimaryAction = primaryAction ?? defaultPrimaryAction;

  return (
    <List.Item
      title={model.name}
      subtitle={model.providerName}
      icon={{ source: model.providerLogo, fallback: Icon.Globe }}
      accessories={accessories}
      keywords={keywords}
      actions={
        <ModelActions
          model={model}
          onAddToComparison={onAddToComparison}
          canAddToComparison={canAddToComparison}
          primaryAction={resolvedPrimaryAction}
          extraActions={extraActions}
        />
      }
    />
  );
});
