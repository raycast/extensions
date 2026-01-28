import {
  Action,
  ActionPanel,
  List,
  Icon,
  Color,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { $history, deleteHistoryEntry, clearHistory } from "../store/history";
import { runRequest } from "../utils";
import { ResponseView } from "./response";
import { Collection, HistoryEntry, Method, ResponseData } from "../types";
import { $collections } from "../store";
import axios from "axios";
import { ErrorDetail } from "./error-view";
import { z } from "zod";
import { METHODS } from "../constants";
import { useAtom } from "zod-persist/react";
import { useMemo } from "react";
import { RequestForm } from "./request-form";
import { $environments } from "~/store/environments";
import { resolveVariables, substitutePlaceholders } from "~/utils/environment-utils";

// Helper function to get a color for the status code accessory
function getStatusAccessory(status: number): List.Item.Accessory {
  let color = Color.PrimaryText;
  if (status >= 500) color = Color.Red;
  else if (status >= 400) color = Color.Red;
  else if (status >= 300) color = Color.Orange;
  else if (status >= 200) color = Color.Green;
  return { tag: { value: String(status), color } };
}

function getMethodAccessory(method: Method): List.Item.Accessory {
  const color = METHODS[method]?.color ?? Color.PrimaryText;
  return { tag: { value: method, color } };
}

function CommonActions() {
  return (
    <Action
      title="Clear All History"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "x" },
        windows: { modifiers: ["ctrl", "shift"], key: "x" },
      }}
      onAction={async () => {
        if (
          await confirmAlert({
            title: "Clear All History?",
            message: "This will permanently delete all saved request entries.",
            primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
          })
        ) {
          try {
            await clearHistory();
            void showToast({ title: "History Cleared" });
          } catch (error) {
            void showToast({
              style: Toast.Style.Failure,
              title: "Operation Failed",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      }}
    />
  );
}

interface HistoryViewProps {
  // Add an optional prop to filter the history
  filterByRequestId?: string;
}

export function HistoryView({ filterByRequestId }: HistoryViewProps) {
  const { push } = useNavigation();
  const { value: allHistory } = useAtom($history);
  const { value: collections } = useAtom($collections);
  const { value: environments } = useAtom($environments);
  const history = filterByRequestId
    ? allHistory.filter((entry) => entry.sourceRequestId === filterByRequestId)
    : allHistory;

  const navigationTitle = filterByRequestId ? "Run History for Request" : "Request History";

  const requestCollectionMap = useMemo(() => {
    const map = new Map<string, Collection>();
    for (const collection of collections) {
      for (const request of collection.requests) {
        map.set(request.id, collection);
      }
    }
    return map;
  }, [collections]);

  return (
    <List
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <CommonActions />
        </ActionPanel>
      }
    >
      {history.length === 0 ? (
        <List.EmptyView title="No History Found" description="Run some requests to see their history here." />
      ) : (
        history.map((entry: HistoryEntry) => {
          const collectionName = entry.sourceRequestId ? requestCollectionMap.get(entry.sourceRequestId)?.title : null;

          const date = new Date(entry.createdAt);
          // Find the environment object first
          const env = environments.find((e) => e.id === entry.activeEnvironmentId);
          // Conditionally create the environment part of the string
          const envNamePart = env ? `(${env.name}) ` : ""; // e.g., "(Staging) " or ""
          const collectionNamePart = collectionName ?? "Unsaved Request";
          const datePart = `${date.toDateString()} ${date.toLocaleTimeString()}`;
          const subtitle = `${collectionNamePart} ${envNamePart}| ${datePart}`;
          return (
            <List.Item
              key={entry.id}
              title={
                substitutePlaceholders(entry.requestSnapshot.title, resolveVariables()) || entry.requestSnapshot.url
              }
              subtitle={subtitle}
              accessories={[
                getMethodAccessory(entry.requestSnapshot.method),
                getStatusAccessory(entry.response.status),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Full Response"
                    icon={Icon.Eye}
                    target={
                      <ResponseView
                        requestSnapshot={entry.requestSnapshot}
                        sourceRequestId={entry.sourceRequestId}
                        response={entry.response}
                      />
                    }
                  />

                  <Action
                    title="View Request"
                    icon={Icon.Eye}
                    onAction={() => {
                      // 1. Find the original collection to get its context (e.g., global headers)
                      const sourceCollection = collections.find((c) =>
                        c.requests.some((r) => r.id === entry.sourceRequestId),
                      );

                      if (!sourceCollection) {
                        void showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to Re-run",
                          message: "Original collection could not be found.",
                        });
                        return;
                      }
                      push(<RequestForm collectionId={sourceCollection.id} request={entry.requestSnapshot} />);
                    }}
                  />

                  <Action
                    title="Re-Run Request"
                    icon={Icon.Bolt}
                    onAction={async () => {
                      const toast = await showToast({ style: Toast.Style.Animated, title: "Re-running request..." });

                      // 1. Find the original collection to get its context (e.g., global headers)
                      const sourceCollection = collections.find((c) =>
                        c.requests.some((r) => r.id === entry.sourceRequestId),
                      );

                      if (!sourceCollection) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Failed to Re-run";
                        toast.message = "Original collection could not be found.";
                        return;
                      }

                      try {
                        // 2. Re-run the request using the snapshot and the original collection
                        const response = await runRequest(entry.requestSnapshot, sourceCollection);
                        void toast.hide();

                        const responseData: ResponseData = {
                          requestMethod: entry.requestSnapshot.method,
                          status: response.status,
                          statusText: response.statusText,
                          headers: response.headers as Record<string, string>,
                          body: response.data,
                          requestUrl: entry.requestSnapshot.url,
                        };

                        push(
                          <ResponseView
                            requestSnapshot={entry.requestSnapshot}
                            sourceRequestId={entry.sourceRequestId}
                            response={responseData}
                          />,
                        );
                      } catch (error) {
                        // 3. Handle errors just like our other run actions
                        void toast.hide();
                        if (axios.isAxiosError(error) && error.response) {
                          push(
                            <ResponseView
                              sourceRequestId={entry.sourceRequestId}
                              requestSnapshot={entry.requestSnapshot}
                              response={{
                                requestUrl: entry.requestSnapshot.url,
                                requestMethod: entry.requestSnapshot.method,
                                status: error.response.status,
                                statusText: error.response.statusText,
                                headers: error.response.headers as Record<string, string>,
                                body: error.response.data,
                              }}
                            />,
                          );
                        } else if (error instanceof z.ZodError) {
                          void toast.hide();
                          // This is a validation error from our schema -> Show the ErrorDetail view
                          push(<ErrorDetail error={error} />);
                        } else if (axios.isAxiosError(error) && error.code === "ENOTFOUND") {
                          // This is a DNS/network error, which often means a VPN isn't connected.
                          toast.style = Toast.Style.Failure;
                          toast.title = "Host Not Found";
                          toast.message = "Check your internet or VPN connection.";
                        } else {
                          // This is a network error (e.g., connection refused) or another issue.
                          // For these, a toast is appropriate.
                          toast.style = Toast.Style.Failure;
                          toast.title = "Request Failed";
                          toast.message = String(error);
                        }
                      }
                    }}
                  />

                  <Action
                    title="Delete Entry"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Delete Entry?",
                          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        try {
                          await deleteHistoryEntry(entry.id);
                          void showToast({ style: Toast.Style.Success, title: "Entry Deleted" });
                        } catch (error) {
                          void showToast({
                            style: Toast.Style.Failure,
                            title: "Operation Failed",
                            message: error instanceof Error ? error.message : "Unknown error",
                          });
                        }
                      }
                    }}
                  />
                  <ActionPanel.Section>
                    <CommonActions />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
