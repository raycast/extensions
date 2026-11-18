import { useState } from "react";
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { ResultsViewProps } from "../types";
import { useIPSearch } from "../hooks/useIPSearch";
import {
  generateResourceURL,
  getResourceIcon,
  getResourceTypeName,
} from "../utils";

export function ResultsView({
  ip,
  mode,
  customProjectIds,
  initialResults,
  onSaveToHistory,
  onSearchAgain,
  onRemoveFromHistory,
}: ResultsViewProps) {
  const { results, isLoading, scanProgress } = useIPSearch({
    ip,
    mode,
    customProjectIds,
    initialResults,
    onSaveToHistory,
    onRemoveFromHistory,
  });

  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [resultFilterText, setResultFilterText] = useState("");

  // Filter results based on search text
  const filteredResults = !resultFilterText
    ? results
    : results.filter((result) => {
        const lowerFilter = resultFilterText.toLowerCase();
        return (
          result.name.toLowerCase().includes(lowerFilter) ||
          result.projectId.toLowerCase().includes(lowerFilter) ||
          result.status?.toLowerCase().includes(lowerFilter) ||
          result.region?.toLowerCase().includes(lowerFilter) ||
          result.zone?.toLowerCase().includes(lowerFilter) ||
          result.ipAddress.includes(lowerFilter) ||
          result.addressType?.toLowerCase().includes(lowerFilter)
        );
      });

  const getModeLabelContent = () => {
    switch (mode) {
      case "quick":
        return "Quick Scan";
      case "full":
        return "Full Scan";
      case "custom":
        return "Custom Scan";
      default:
        return "";
    }
  };

  return (
    <List
      isLoading={false}
      searchBarPlaceholder={isLoading ? "Scanning..." : "Filter results..."}
      navigationTitle={`Results for ${ip} (${getModeLabelContent()})`}
      isShowingDetail={isShowingDetail}
      onSearchTextChange={setResultFilterText}
      searchText={resultFilterText}
    >
      {isLoading ? (
        <List.EmptyView
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
          title={
            scanProgress.total > 0
              ? `Scanning Projects (${scanProgress.current}/${scanProgress.total})`
              : "Initializing..."
          }
          description={
            scanProgress.currentProjectName && scanProgress.currentProjectId
              ? `Current: ${scanProgress.currentProjectName} (${scanProgress.currentProjectId})`
              : scanProgress.currentProjectName
                ? `Current: ${scanProgress.currentProjectName}`
                : "Starting search..."
          }
        />
      ) : filteredResults.length > 0 ? (
        <>
          <List.Section
            title={`Found ${filteredResults.length} ${filteredResults.length === 1 ? "resource" : "resources"} (${getModeLabelContent()})`}
          >
            {filteredResults.map((result, index) => {
              const resourceURL = generateResourceURL(result);
              const icon = getResourceIcon(result.resourceType);
              const resourceTypeName = getResourceTypeName(result.resourceType);
              const displayName = result.name;

              // Helper to get localized status and color
              const getStatusInfo = () => {
                let text = result.status || "-";
                let color = Color.SecondaryText;

                if (result.resourceType === "addresses") {
                  const statusRaw = result.status?.toUpperCase();
                  const typeStr = result.isStatic ? "Static" : "Ephemeral";

                  let statusStr = result.status || "";
                  if (statusRaw === "IN_USE") statusStr = "In Use";
                  else if (statusRaw === "RESERVED") statusStr = "Reserved";

                  text = statusRaw ? `${statusStr} (${typeStr})` : typeStr;

                  if (statusRaw === "RESERVED" || result.isStatic) {
                    color = Color.Green;
                  } else if (statusRaw === "IN_USE") {
                    color = Color.Orange;
                  }
                } else if (result.resourceType === "instances") {
                  const statusRaw = result.status?.toUpperCase();
                  if (statusRaw === "RUNNING") {
                    text = "Running";
                    color = Color.Green;
                  } else if (statusRaw === "TERMINATED") {
                    text = "Stopped";
                    color = Color.SecondaryText;
                  } else if (statusRaw) {
                    text = statusRaw;
                    color = Color.Orange;
                  }
                } else if (result.status) {
                  const statusRaw = result.status.toUpperCase();
                  if (statusRaw === "ACTIVE" || statusRaw === "READY")
                    color = Color.Green;
                }

                return { text, color };
              };

              const statusInfo = getStatusInfo();

              return (
                <List.Item
                  key={`${result.projectId}-${result.name}-${index}`}
                  icon={icon}
                  title={displayName}
                  accessories={
                    !isShowingDetail
                      ? [
                          { text: result.projectId, tooltip: "Project ID" },
                          {
                            text: result.region || result.zone || "Global",
                            tooltip: "Region/Zone",
                          },
                          ...(result.resourceType !== "forwarding-rules"
                            ? [
                                {
                                  tag: {
                                    value: statusInfo.text,
                                    color: statusInfo.color,
                                  },
                                },
                              ]
                            : []),
                        ]
                      : undefined
                  }
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        url={resourceURL}
                        title="Open in GCP Console"
                      />
                      <Action.CopyToClipboard
                        content={resourceURL}
                        title="Copy Link"
                      />
                      <Action
                        title={
                          isShowingDetail ? "Hide Details" : "Show Details"
                        }
                        icon={Icon.Sidebar}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                        onAction={() => setIsShowingDetail((prev) => !prev)}
                      />

                      {/* Search Actions for Instance IPs */}
                      {result.resourceType === "instances" && (
                        <>
                          {result.internalIP && result.internalIP !== ip && (
                            <Action
                              title={`Start Search ${result.internalIP}`}
                              icon={Icon.MagnifyingGlass}
                              onAction={() => onSearchAgain(result.internalIP!)}
                            />
                          )}
                          {result.externalIP && result.externalIP !== ip && (
                            <Action
                              title={`Start Search ${result.externalIP}`}
                              icon={Icon.MagnifyingGlass}
                              onAction={() => onSearchAgain(result.externalIP!)}
                            />
                          )}
                        </>
                      )}
                    </ActionPanel>
                  }
                  detail={
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Resource Name"
                            text={result.name}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Project ID"
                            text={result.projectId}
                          />
                          <List.Item.Detail.Metadata.TagList title="Resource Type">
                            <List.Item.Detail.Metadata.TagList.Item
                              text={resourceTypeName}
                              color={Color.Blue}
                            />
                          </List.Item.Detail.Metadata.TagList>

                          <List.Item.Detail.Metadata.Separator />

                          {result.resourceType === "instances" ? (
                            <>
                              {result.internalIP && (
                                <List.Item.Detail.Metadata.Label
                                  title="Internal IP"
                                  text={result.internalIP}
                                />
                              )}
                              {result.externalIP && (
                                <List.Item.Detail.Metadata.Label
                                  title="External IP"
                                  text={result.externalIP}
                                />
                              )}
                            </>
                          ) : (
                            <List.Item.Detail.Metadata.Label
                              title="IP Address"
                              text={result.ipAddress}
                            />
                          )}

                          <List.Item.Detail.Metadata.Label
                            title="IP Version"
                            text={
                              result.ipVersion ||
                              (result.ipAddress.includes(":") ? "IPV6" : "IPV4")
                            }
                          />
                          {result.addressType && (
                            <List.Item.Detail.Metadata.TagList title="Address Type">
                              <List.Item.Detail.Metadata.TagList.Item
                                text={
                                  result.addressType === "INTERNAL"
                                    ? "Internal"
                                    : result.addressType === "EXTERNAL"
                                      ? "External"
                                      : result.addressType
                                }
                                color={
                                  result.addressType === "EXTERNAL"
                                    ? Color.Green
                                    : Color.Yellow
                                }
                              />
                            </List.Item.Detail.Metadata.TagList>
                          )}

                          <List.Item.Detail.Metadata.Separator />

                          {result.region && (
                            <List.Item.Detail.Metadata.Label
                              title="Region"
                              text={result.region}
                            />
                          )}
                          {result.subnetwork && (
                            <List.Item.Detail.Metadata.Label
                              title="Subnetwork"
                              text={result.subnetwork}
                            />
                          )}
                          {result.networkTier && (
                            <List.Item.Detail.Metadata.Label
                              title="Network Tier"
                              text={
                                result.networkTier === "PREMIUM"
                                  ? "Premium"
                                  : result.networkTier === "STANDARD"
                                    ? "Standard"
                                    : result.networkTier
                              }
                            />
                          )}

                          {result.status &&
                            result.resourceType !== "forwarding-rules" && (
                              <List.Item.Detail.Metadata.TagList title="Status">
                                <List.Item.Detail.Metadata.TagList.Item
                                  text={statusInfo.text}
                                  color={statusInfo.color}
                                />
                              </List.Item.Detail.Metadata.TagList>
                            )}

                          {result.users && result.users.length > 0 && (
                            <>
                              <List.Item.Detail.Metadata.Separator />
                              <List.Item.Detail.Metadata.Label title="Used By" />
                              {result.users.map((user) => (
                                <List.Item.Detail.Metadata.Label
                                  key={user}
                                  title=""
                                  text={user.split("/").pop()}
                                />
                              ))}
                            </>
                          )}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                />
              );
            })}
          </List.Section>
        </>
      ) : (
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="No Resources Found"
          description={`IP ${ip} was not found in any of your GCP projects.`}
        />
      )}
    </List>
  );
}
