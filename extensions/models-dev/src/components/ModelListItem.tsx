import { List, Icon } from "@raycast/api";
import { useMemo, memo } from "react";
import { Model } from "../lib/types";
import { formatPriceFixed } from "../lib/formatters";
import { ModelActions } from "./ModelActions";
import { STATUS_COLORS } from "../lib/constants";
import { getCapabilityAccessories } from "../lib/accessories";

interface ModelListItemProps {
  model: Model;
}

export const ModelListItem = memo(function ModelListItem({ model }: ModelListItemProps) {
  const defaultAccessories = useMemo(() => {
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

  return (
    <List.Item
      title={model.name}
      subtitle={model.providerName}
      icon={{ source: model.providerLogo, fallback: Icon.Globe }}
      accessories={defaultAccessories}
      actions={<ModelActions model={model} />}
    />
  );
});
