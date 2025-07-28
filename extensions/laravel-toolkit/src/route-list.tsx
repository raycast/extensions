import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { findLaravelProjectRoot } from "../lib/projectLocator";
import { runArtisan } from "../lib/artisan";
import { useDebounce } from "../lib/hooks";
import { formatProjectInfo } from "../lib/projectDisplay";

interface Route {
  method: string;
  uri: string;
  name?: string;
  action: string;
  middleware?: string[];
}

interface LaravelRouteJsonItem {
  method: string | string[];
  uri: string;
  name?: string | null;
  action: string;
  middleware?: string[] | null;
}

function parseRouteList(output: string): Route[] {
  const lines = output.trim().split("\n");
  const routes: Route[] = [];

  // Try to parse as JSON first (some Laravel versions support --format=json)
  try {
    const jsonData = JSON.parse(output);
    if (Array.isArray(jsonData)) {
      return jsonData.map((route: LaravelRouteJsonItem) => ({
        method: Array.isArray(route.method) ? route.method.join("|") : route.method,
        uri: route.uri,
        name: route.name || undefined,
        action: route.action,
        middleware: route.middleware || undefined,
      }));
    }
  } catch (jsonError) {
    // Not JSON, continue with table parsing
    console.warn("Failed to parse route list as JSON:", jsonError);
  }

  // Skip header lines and find the data
  let dataStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Method") && lines[i].includes("URI") && lines[i].includes("Action")) {
      dataStartIndex = i + 2; // Skip header and separator line
      break;
    }
  }

  if (dataStartIndex === -1) {
    // Fallback: look for any line that looks like a route (starts with GET, POST, etc.)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/)) {
        dataStartIndex = i;
        break;
      }
    }
  }

  if (dataStartIndex === -1) {
    // Could not determine where route data begins
    return routes;
  }

  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line || line.startsWith("+") || line.startsWith("-") || line.includes("=")) continue;

    // Parse table format: | Method | URI | Name | Action | Middleware |
    if (line.includes("|")) {
      const parts = line
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean);

      if (parts.length >= 4) {
        routes.push({
          method: parts[0],
          uri: parts[1],
          name: parts[2] || undefined,
          action: parts[3],
          middleware: parts[4] ? parts[4].split(",").map((m) => m.trim()) : undefined,
        });
      }
    } else {
      // Try parsing space-separated format (fallback)
      const parts = line.split(/\s+/);
      if (parts.length >= 3 && parts[0].match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/)) {
        routes.push({
          method: parts[0],
          uri: parts[1],
          name: parts.length > 3 ? parts[2] : undefined,
          action: parts.length > 3 ? parts[3] : parts[2],
          middleware: undefined,
        });
      }
    }
  }

  return routes;
}

export default function Command() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const debouncedSearchText = useDebounce(searchText, 300);

  useEffect(() => {
    async function fetchRoutes() {
      try {
        const projectRoot = await findLaravelProjectRoot();
        if (!projectRoot) {
          setError("No active Laravel project found. Please add a project first.");
          return;
        }
        setProjectPath(projectRoot);

        // Try JSON format first for better parsing
        let output: string;
        try {
          output = await runArtisan("route:list --json", projectRoot);
        } catch {
          // Fallback to regular format if JSON not supported
          console.warn("JSON format not supported, falling back to table format");
          output = await runArtisan("route:list", projectRoot);
        }

        const parsedRoutes = parseRouteList(output);
        setRoutes(parsedRoutes);
        setFilteredRoutes(parsedRoutes);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load routes",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchRoutes();
  }, []);

  // Filter routes based on search text
  useEffect(() => {
    if (!debouncedSearchText.trim()) {
      setFilteredRoutes(routes);
      return;
    }

    const searchLower = debouncedSearchText.toLowerCase();
    const filtered = routes.filter(
      (route) =>
        route.uri.toLowerCase().includes(searchLower) ||
        route.method.toLowerCase().includes(searchLower) ||
        (route.name && route.name.toLowerCase().includes(searchLower)) ||
        route.action.toLowerCase().includes(searchLower),
    );

    setFilteredRoutes(filtered);
  }, [debouncedSearchText, routes]);

  if (error) {
    return (
      <List>
        <List.EmptyView title="Error Loading Routes" description={error} icon={Icon.ExclamationMark} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter routes by URI, name, or method..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle={true}
      navigationTitle={projectPath ? `Routes - ${formatProjectInfo(projectPath)}` : "Routes"}
    >
      {filteredRoutes.map((route, index) => (
        <List.Item
          key={`${route.method}-${route.uri}-${index}`}
          title={route.uri}
          subtitle={route.name || ""}
          accessories={[{ text: route.method, icon: getMethodIcon(route.method) }]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Method" text={route.method} />
                  <List.Item.Detail.Metadata.Label title="URI" text={route.uri} />
                  {route.name && <List.Item.Detail.Metadata.Label title="Name" text={route.name} />}
                  <List.Item.Detail.Metadata.Label title="Action" text={route.action} />
                  {route.middleware && route.middleware.length > 0 && (
                    <List.Item.Detail.Metadata.TagList title="Middleware">
                      {route.middleware.map((middleware, i) => (
                        <List.Item.Detail.Metadata.TagList.Item key={i} text={middleware} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Uri"
                content={route.uri}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              {route.name && (
                <Action.CopyToClipboard
                  title="Copy Route Name"
                  content={route.name}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              )}
              <Action.CopyToClipboard
                title="Copy Action"
                content={route.action}
                shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {filteredRoutes.length === 0 && !isLoading && routes.length > 0 && (
        <List.EmptyView
          title="No Routes Match"
          description={`No routes match "${searchText}"`}
          icon={Icon.MagnifyingGlass}
        />
      )}
      {routes.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Routes Found"
          description="No routes found in this Laravel project"
          icon={Icon.List}
        />
      )}
    </List>
  );
}

function getMethodIcon(method: string): Icon {
  switch (method.toUpperCase()) {
    case "GET":
      return Icon.Download;
    case "POST":
      return Icon.Upload;
    case "PUT":
    case "PATCH":
      return Icon.Pencil;
    case "DELETE":
      return Icon.Trash;
    default:
      return Icon.Dot;
  }
}
