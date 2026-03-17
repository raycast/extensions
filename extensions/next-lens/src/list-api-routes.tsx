import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import { fetchApiRoutes } from "./next-lens-client";
import { ApiRoute, HTTP_METHODS } from "./types";

// Map HTTP methods to colors for better visual distinction
const METHOD_COLORS: Record<string, Color> = {
  GET: Color.Green,
  POST: Color.Blue,
  PUT: Color.Orange,
  PATCH: Color.Yellow,
  DELETE: Color.Red,
  HEAD: Color.Purple,
  OPTIONS: Color.Magenta,
};

export default function ListApiRoutes() {
  const [selectedMethod, setSelectedMethod] = useState<string>("all");
  const { ideApp } = getPreferenceValues();

  const { data, isLoading, error, revalidate } = useCachedPromise(fetchApiRoutes, [], {
    keepPreviousData: true,
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch API routes",
        message: err.message,
      });
    },
  });

  // Get unique methods from data for dropdown
  const availableMethods = useMemo(() => {
    if (!data) return [];
    const methodSet = new Set<string>();
    data.forEach((route) => {
      route.methods.forEach((method) => methodSet.add(method));
    });
    // Sort by common HTTP methods order
    return HTTP_METHODS.filter((m) => methodSet.has(m));
  }, [data]);

  // Filter routes based on selected method
  const filteredRoutes = useMemo(() => {
    if (!data) return [];
    if (selectedMethod === "all") return data;
    return data.filter((route) => route.methods.includes(selectedMethod));
  }, [data, selectedMethod]);

  async function openInIDE(filePath: string) {
    try {
      await open(filePath, ideApp);
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open file",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search API routes..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by HTTP Method" value={selectedMethod} onChange={setSelectedMethod}>
          <List.Dropdown.Item title="All Methods" value="all" />
          <List.Dropdown.Section title="HTTP Methods">
            {availableMethods.map((method) => (
              <List.Dropdown.Item key={method} title={method} value={method} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Unable to connect to next-lens"
          description="Please run npx next-lens@latest raycast in your Next.js project"
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Command" content="npx next-lens@latest raycast" />
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : filteredRoutes.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No routes found"
          description={selectedMethod === "all" ? "No API routes available" : `No routes with ${selectedMethod} method`}
        />
      ) : (
        filteredRoutes.map((route) => <ApiRouteItem key={route.path} route={route} onOpenInIDE={openInIDE} />)
      )}
    </List>
  );
}

function ApiRouteItem({ route, onOpenInIDE }: { route: ApiRoute; onOpenInIDE: (filePath: string) => void }) {
  return (
    <List.Item
      title={route.path}
      accessories={route.methods.map((method) => ({
        tag: {
          value: method,
          color: METHOD_COLORS[method] || Color.SecondaryText,
        },
      }))}
      actions={
        <ActionPanel>
          <Action title="Open in IDE" icon={Icon.Code} onAction={() => onOpenInIDE(route.file)} />
          <Action.CopyToClipboard
            title="Copy Path"
            content={route.path}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "c" },
              Windows: { modifiers: ["ctrl"], key: "c" },
            }}
          />
          <Action.CopyToClipboard
            title="Copy File Path"
            content={route.file}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "c" },
              Windows: { modifiers: ["ctrl", "shift"], key: "c" },
            }}
          />
        </ActionPanel>
      }
    />
  );
}
