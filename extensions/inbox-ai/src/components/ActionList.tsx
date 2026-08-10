import { Icon, ActionPanel, Action, List, showToast, Toast, open } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import { useState, useEffect } from "react";
import { PlistData, SavedAction, readPlistFile, getIconForName, filterActions } from "../actions";

interface ActionListProps {
  commandName: string;
  supportedTypes: string[];
  urlScheme: string;
  launchContext?: {
    actionId?: string;
    originalInput?: string;
    variables?: Record<string, string>;
  };
  onActionSelect?: (action: SavedAction) => void;
  extraUrlParams?: Record<string, string>;
  extraActions?: (action: SavedAction) => JSX.Element[];
}

export default function ActionList({
  commandName,
  supportedTypes,
  urlScheme,
  launchContext,
  onActionSelect,
  extraUrlParams = {},
  extraActions,
}: ActionListProps) {
  const [plistData, setPlistData] = useState<PlistData | null>(null);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const data = readPlistFile();
    if (data) {
      setPlistData(data);
      // If we have a context with actionId, execute that action
      if (launchContext?.actionId) {
        const action = data.savedActions.find((a) => a.id === launchContext.actionId);
        if (action) {
          if (onActionSelect) {
            onActionSelect(action);
          } else {
            const params = new URLSearchParams();
            params.append("action", action.id);

            // Add original input if provided
            if (launchContext.originalInput) {
              params.append("originalInput", launchContext.originalInput);
            }

            // Add any extra URL parameters
            Object.entries(extraUrlParams).forEach(([key, value]) => {
              params.append(key, value);
            });

            // Add any variables from context
            if (launchContext.variables) {
              Object.entries(launchContext.variables).forEach(([key, value]) => {
                params.append(key, value);
              });
            }

            const url = `inboxai://${urlScheme}?${params.toString()}`;
            open(url).catch(() => {
              showToast({
                style: Toast.Style.Failure,
                title: "Error",
                message: "Failed to launch Inbox AI. Is it installed?",
              });
            });
          }
        }
      }
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Could not read Inbox AI preferences",
      });
    }
  }, [launchContext]);

  const filteredActions = filterActions(plistData?.savedActions, searchText, supportedTypes);

  const triggerAction = async (action: SavedAction) => {
    if (onActionSelect) {
      onActionSelect(action);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append("action", action.id);

      // Add any extra URL parameters
      Object.entries(extraUrlParams).forEach(([key, value]) => {
        params.append(key, value);
      });

      const url = `inboxai://${urlScheme}?${params.toString()}`;
      await open(url);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to launch Inbox AI. Is it installed?",
      });
    }
  };

  return (
    <List searchText={searchText} onSearchTextChange={setSearchText} searchBarPlaceholder="Search actions...">
      <List.Section title="Available Actions">
        {filteredActions.map((action) => (
          <List.Item
            key={action.id}
            title={action.displayName}
            subtitle={action.description}
            icon={{ source: getIconForName(action.icon) }}
            accessories={[{ text: action.type === "askAI" ? "Ask AI" : "AI Conversation" }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action icon={Icon.CommandSymbol} title="Trigger Action" onAction={() => triggerAction(action)} />
                  {extraActions && extraActions(action)}
                  <Action.CreateQuicklink
                    title="Create Quick Link"
                    quicklink={{
                      name: action.displayName,
                      link: createDeeplink({
                        command: commandName,
                        context: {
                          actionId: action.id,
                        },
                      }),
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
