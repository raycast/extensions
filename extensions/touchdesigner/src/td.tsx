import React, { useMemo } from "react";
import { ActionPanel, Action, List, environment } from "@raycast/api";
import { operatorData } from "./tdOperators";



// Better typed interfaces
interface Operator {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  url: string;
}

interface Sweet16Operator {
  name: string;
  purpose: string;
}

interface OperatorFamily {
  description: string;
  operators?: string[];
  sweet_16?: Sweet16Operator[];
  types?: Record<string, string[]>;
}

 

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

// Debug logging utility with proper typing
const debug = (message: string, data?: unknown): void => {
  if (environment.isDevelopment) {
    console.log(`[Debug] ${message}`, data ?? "");
  }
};

// Utility functions
const sanitizeOperatorName = (name: string): string => {
  debug("Sanitizing operator name:", name);
  if (!name || typeof name !== "string") {
    debug("Invalid operator name:", name);
    return "";
  }
  return name.trim().replace(/\s+/g, "_");
};

const createUrl = (family: string, operatorName: string): string => {
  const sanitizedName = sanitizeOperatorName(operatorName);
  const url = `${BASE_DOC_URL}/${sanitizedName}_${family}`;
  debug("Created URL:", url);
  return url;
};

const getFamilyIcon = (family: string): string => {
  const icon = ICONS[family] || ICONS.DEFAULT;
  debug("Selected icon for family:", { family, icon });
  return icon;
};

const createOperatorEntry = (family: string, title: string, subtitle: string): Operator => {
  debug("Creating operator entry:", { family, title, subtitle });
  return {
    id: `${family}-${title}`,
    title,
    subtitle,
    icon: getFamilyIcon(family),
    url: createUrl(family, title),
  };
};

const processOperators = (family: string, data: OperatorFamily): Operator[] => {
  debug("Processing operators for family:", family);
  const operators: Operator[] = [];

  try {
    // Process regular operators
    if (Array.isArray(data.operators)) {
      data.operators.forEach((op) => {
        if (typeof op === "string") {
          operators.push(createOperatorEntry(family, op, `${family} | ${data.description}`));
        }
      });
    }

    // Process sweet_16 operators
    if (Array.isArray(data.sweet_16)) {
      data.sweet_16.forEach((op) => {
        if (op && typeof op.name === "string") {
          operators.push(createOperatorEntry(family, op.name, `${family} Sweet 16 | ${op.purpose}`));
        }
      });
    }

    // Process types (for COMP operators)
    if (data.types) {
      Object.entries(data.types).forEach(([type, ops]) => {
        if (Array.isArray(ops)) {
          ops.forEach((op) => {
            if (typeof op === "string") {
              operators.push(createOperatorEntry(family, op, `${family} ${type} | ${data.description}`));
            }
          });
        }
      });
    }
  } catch (error) {
    debug("Error processing operators:", error instanceof Error ? error.message : "Unknown error");
  }

  return operators;
};

export default function Command() {
  const allOperators = useMemo(() => {
    debug("Starting operator processing");
    let operators: Operator[] = [];

    try {
      Object.entries(operatorData.operators).forEach(([family, data]) => {
        const familyOperators = processOperators(family, data);
        operators = operators.concat(familyOperators);
      });

      // Sort operators by title for better UX
      operators = operators.sort((a, b) => a.title.localeCompare(b.title));
      debug("Processed operators count:", operators.length);
    } catch (error) {
      debug("Error in operator processing:", error instanceof Error ? error.message : "Unknown error");
      operators = [];
    }

    return operators;
  }, []);

  // Memoize ActionPanel to prevent unnecessary rerenders
  const operatorActions = useMemo(
    () => (item: Operator) => (
      <ActionPanel>
        <Action.OpenInBrowser title="Open Documentation" url={item.url} />
        <Action.CopyToClipboard title="Copy Operator Name" content={item.title} />
        <Action.CopyToClipboard title="Copy Documentation URL" content={item.url} />
      </ActionPanel>
    ),
    [],
  );

  // Early return if no operators found
  if (!allOperators.length) {
    debug("No operators found");
    return (
      <List>
        <List.EmptyView title="No operators found" description="Please check your data source" />
      </List>
    );
  }

  debug("Rendering operator list");
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
