/**
 * Manage Custom Sources Command
 *
 * List, edit, toggle and remove custom OSINT sources stored in LocalStorage
 */

import {
  List,
  ActionPanel,
  Action,
  Toast,
  showToast,
  Icon,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getCustomSources,
  getAllSources,
  getSourceById,
  isSourceEnabled,
  removeCustomSource,
  addCustomSource,
} from "./utils/osint-sources";
import { getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences } from "./types";
import { OSINTSource } from "./types";

export default function ManageSourcesCommand() {
  const [sources, setSources] = useState<OSINTSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customs, setCustoms] = useState<OSINTSource[]>([]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const items = await getAllSources();
      const customItems = await getCustomSources();
      setSources(items);
      setCustoms(customItems);
      setIsLoading(false);
    };
    load();
  }, []);

  const refresh = async () => {
    const items = await getAllSources();
    const customItems = await getCustomSources();
    setSources(items);
    setCustoms(customItems);
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Manage custom OSINT sources"
    >
      {sources.length === 0 && !isLoading && (
        <List.EmptyView
          title="No custom sources"
          description="Use Import Custom Source to add a new one"
        />
      )}
      {sources.map((source) => {
        const preferences = getPreferenceValues<ExtensionPreferences>();
        const effectiveEnabled = isSourceEnabled(source, preferences);
        const customOverride = customs.find((c) => c.id === source.id);
        const isBuiltin = !!getSourceById(source.id);

        return (
          <List.Item
            key={source.id}
            id={source.id}
            title={source.name}
            subtitle={source.description}
            icon={{ source: Icon.Globe }}
            accessories={[{ text: effectiveEnabled ? "Enabled" : "Disabled" }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open URL"
                  url={source.url.replace(/\$\{ioc\}/g, "example.com")}
                />
                <Action
                  title={effectiveEnabled ? "Disable Source" : "Enable Source"}
                  onAction={async () => {
                    try {
                      const targetEnabled = !effectiveEnabled;
                      const builtin = getSourceById(source.id);
                      const updated = customOverride
                        ? { ...customOverride, enabled: targetEnabled }
                        : builtin
                          ? { ...builtin, enabled: targetEnabled }
                          : { ...source, enabled: targetEnabled };
                      await addCustomSource(updated);
                      await refresh();
                      showToast({
                        style: Toast.Style.Success,
                        title: `${targetEnabled ? "Enabled" : "Disabled"}`,
                        message: `${updated.name}`,
                      });
                    } catch (error) {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Error",
                        message:
                          error instanceof Error
                            ? error.message
                            : String(error),
                      });
                    }
                  }}
                />
                <Action
                  title="Edit JSON"
                  onAction={async () => {
                    // copy JSON to clipboard and instruct user to re-import via Import command for editing
                    const json = JSON.stringify(source, null, 2);
                    await Clipboard.copy(json);
                    showToast({
                      style: Toast.Style.Success,
                      title: "Copied JSON",
                      message: "Paste into Import Custom Source to edit",
                    });
                  }}
                />
                {customOverride ? (
                  <Action
                    title={isBuiltin ? "Reset to Default" : "Delete"}
                    style={isBuiltin ? undefined : Action.Style.Destructive}
                    onAction={async () => {
                      await removeCustomSource(source.id);
                      await refresh();
                      showToast({
                        style: Toast.Style.Success,
                        title: isBuiltin ? "Reset to Default" : "Removed",
                        message: `${source.name} ${isBuiltin ? "reset" : "removed"}`,
                      });
                    }}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
