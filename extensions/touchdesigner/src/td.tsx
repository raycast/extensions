import React, { useMemo } from "react";
import { ActionPanel, Action, List, environment } from "@raycast/api";
import { operatorData, Operator } from "./tdOperators";

// Constants
const BASE_DOC_URL = "https://derivative.ca/UserGuide";
const ICONS: Readonly<Record<string, string>> = {
  TOP: "🖼️",
  CHOP: "📊",
  SOP: "📐",
  MAT: "🎨",
  COMP: "🧩",
  DEFAULT: "⚡",
} as const;

// Debug logging utility
const debug = (message: string, data?: unknown): void => {
  if (environment.isDevelopment) {
    console.log(`[Debug] ${message}`, data ?? "");
  }
};

// Utility functions
const sanitizeOperatorName = (name: string): string => {
  debug("Sanitizing operator name:", name);
  return name?.trim().replace(/\s+/g, "_") ?? "";
};

const createUrl = (family: string, operatorName: string): string => {
  const sanitizedName = sanitizeOperatorName(operatorName);
  return `${BASE_DOC_URL}/${sanitizedName}_${family}`;
};

const getFamilyIcon = (family: string): string => {
  return ICONS[family] || ICONS.DEFAULT;
};

interface ListItemData {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  url: string;
}

const createListItem = (family: string, operator: Operator): ListItemData => {
  const subtitle = [family, operator.sweet ? "Sweet 16" : "", operator.category, operator.description]
    .filter(Boolean)
    .join(" - ");
  return {
    id: `${family}_${operator.name}`,
    title: operator.name,
    subtitle,
    icon: getFamilyIcon(family),
    url: createUrl(family, operator.name),
  };
};

export default function Command() {
  const allOperators = useMemo(() => {
    debug("Starting operator processing");
    const operators: ListItemData[] = [];

    try {
      Object.entries(operatorData.operators).forEach(([family, data]) => {
        data.operators.forEach((op) => {
          operators.push(createListItem(family, op));
        });
      });

      return operators.sort((a, b) => a.title.localeCompare(b.title));
    } catch (error) {
      debug("Error processing operators:", error instanceof Error ? error.message : "Unknown error");
      return [];
    }
  }, []);

  const operatorActions = useMemo(
    () => (item: ListItemData) => (
      <ActionPanel>
        <Action.OpenInBrowser title="Open Documentation" url={item.url} />
        <Action.CopyToClipboard title="Copy Operator Name" content={item.title} />
        <Action.CopyToClipboard title="Copy Documentation URL" content={item.url} />
      </ActionPanel>
    ),
    [],
  );

  if (!allOperators.length) {
    return (
      <List>
        <List.EmptyView title="No operators found" description="Please check your data source" />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search TouchDesigner operators..." enableFiltering>
      {allOperators.map((item) => (
        <List.Item
          key={item.id}
          icon={item.icon}
          title={item.title}
          subtitle={item.subtitle}
          actions={operatorActions(item)}
        />
      ))}
    </List>
  );
}
