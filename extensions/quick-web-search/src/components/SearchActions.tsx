import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { ReactNode } from "react";
import { CustomEngineData, Engine } from "../engines";
import { executeMultiSearch } from "../multisearch";
import { EngineForm } from "./EngineForm";
import { ManageEnginesView } from "./ManageEnginesView";
import { MultiSearchConfigView } from "./MultiSearchConfigView";
import { OpenSearchAction } from "./OpenSearchAction";

export function SearchActions(props: {
  query: string;
  engine: Engine;
  engines: Engine[];
  isMultiSearchEnabled?: boolean;
  multiSearchEngines?: Engine[];
  onToggleMultiSearch?: () => void;
  onSearch: (query: string) => Promise<void>;
  onRefine?: () => void;
  historyActions?: ReactNode;
  onAddEngine: (data: Omit<CustomEngineData, "id">) => Promise<void>;
  onUpdateEngine: (id: string, data: Omit<CustomEngineData, "id">) => Promise<void>;
  onRemoveEngine: (id: string) => Promise<void>;
}) {
  const {
    query,
    engine,
    engines,
    isMultiSearchEnabled,
    multiSearchEngines,
    onToggleMultiSearch,
    onSearch,
    onRefine,
    historyActions,
    onAddEngine,
    onUpdateEngine,
    onRemoveEngine,
  } = props;

  const otherEngines = engines.filter((item) => item.id !== engine.id);
  const activeMultiEngines = multiSearchEngines && multiSearchEngines.length > 0 ? multiSearchEngines : [engine];

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {isMultiSearchEnabled ? (
          <>
            <Action
              title={`Multi-Search (${activeMultiEngines.map((e) => e.title).join(", ")})`}
              icon={Icon.Layers}
              onAction={() => executeMultiSearch(activeMultiEngines, query, onSearch)}
            />
            <OpenSearchAction title={`Search ${engine.title} Only`} engine={engine} query={query} onSearch={onSearch} />
          </>
        ) : (
          <OpenSearchAction title={`Search ${engine.title}`} engine={engine} query={query} onSearch={onSearch} />
        )}
        {onRefine && <Action title="Put in Search Bar" icon={Icon.Pencil} onAction={onRefine} />}
      </ActionPanel.Section>

      <ActionPanel.Section title="Multi-Search">
        {onToggleMultiSearch && (
          <Action
            title={isMultiSearchEnabled ? "Turn off Multi-Search" : "Turn on Multi-Search"}
            icon={isMultiSearchEnabled ? Icon.XMarkCircle : Icon.Checkmark}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "m" },
              Windows: { modifiers: ["ctrl"], key: "m" },
            }}
            onAction={onToggleMultiSearch}
          />
        )}
        <Action.Push
          title="Configure Multi-Search…"
          icon={Icon.Gear}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "m" },
            Windows: { modifiers: ["ctrl", "shift"], key: "m" },
          }}
          target={<MultiSearchConfigView engines={engines} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Other Engines">
        {otherEngines.map((other) => {
          const index = engines.indexOf(other);
          const key = String(index + 1) as Keyboard.KeyEquivalent;
          const shortcut: Keyboard.Shortcut | undefined =
            index < 9
              ? {
                  macOS: { modifiers: ["cmd"], key },
                  Windows: { modifiers: ["ctrl"], key },
                }
              : undefined;
          return (
            <OpenSearchAction
              key={other.id}
              title={`Search ${other.title} Instead`}
              engine={other}
              query={query}
              onSearch={onSearch}
              shortcut={shortcut}
            />
          );
        })}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy URL"
          content={engine.searchUrl(query)}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.CopyToClipboard title="Copy Query" content={query} shortcut={Keyboard.Shortcut.Common.CopyName} />
      </ActionPanel.Section>

      {historyActions && <ActionPanel.Section>{historyActions}</ActionPanel.Section>}

      <ActionPanel.Section title="Custom Engines">
        <Action.Push
          title="Add Custom Search Engine"
          icon={Icon.Plus}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "a" },
            Windows: { modifiers: ["ctrl", "shift"], key: "a" },
          }}
          target={<EngineForm onSave={onAddEngine} />}
        />
        {engine.isCustom && (
          <>
            <Action.Push
              title={`Edit ${engine.title}`}
              icon={Icon.Pencil}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "e" },
                Windows: { modifiers: ["ctrl", "shift"], key: "e" },
              }}
              target={<EngineForm engine={engine} onSave={(data) => onUpdateEngine(engine.id, data)} />}
            />
            <Action
              title={`Remove ${engine.title}`}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "d" },
                Windows: { modifiers: ["ctrl", "shift"], key: "d" },
              }}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: `Remove "${engine.title}"?`,
                    message: "Are you sure you want to remove this custom search engine?",
                    primaryAction: {
                      title: "Remove",
                      style: Alert.ActionStyle.Destructive,
                    },
                  })
                ) {
                  await onRemoveEngine(engine.id);
                  await showToast({ style: Toast.Style.Success, title: `Removed ${engine.title}` });
                }
              }}
            />
          </>
        )}
        <Action.Push
          title="Manage Custom Engines"
          icon={Icon.Gear}
          target={
            <ManageEnginesView
              engines={engines}
              onAdd={onAddEngine}
              onUpdate={onUpdateEngine}
              onRemove={onRemoveEngine}
            />
          }
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Open Extension Preferences"
          icon={Icon.Gear}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "," },
            Windows: { modifiers: ["ctrl", "shift"], key: "," },
          }}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
