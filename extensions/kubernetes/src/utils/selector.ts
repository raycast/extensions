import { V1LabelSelector } from "@kubernetes/client-node";

export function labelSelectorToString(selector?: V1LabelSelector): string | undefined {
  if (!selector) {
    return undefined;
  }

  const parts: string[] = [];

  if (selector.matchLabels) {
    for (const [key, value] of Object.entries(selector.matchLabels)) {
      parts.push(`${key}=${value}`);
    }
  }

  if (selector.matchExpressions) {
    for (const expr of selector.matchExpressions) {
      if (expr.operator === "In" && expr.values?.length === 1) {
        parts.push(`${expr.key}=${expr.values[0]}`);
      }
    }
  }

  return parts.join(",");
}

export function selectorToString(selector?: { [key: string]: string }): string | undefined {
  if (!selector) {
    return undefined;
  }

  return Object.entries(selector)
    .map(([key, value]) => `${key}=${value}`)
    .join(",");
}
