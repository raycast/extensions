import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";
import { useMemo } from "react";
import { groupByFamily, refKey } from "../catalog/build";
import type { CatalogEntry, ModelRef } from "../core/types";
import { PROVIDER_LABELS } from "../providers";
import { showError } from "./feedback";
import { useCatalog } from "./use-catalog";

/** Text the built-in search can match besides the title. */
export function modelKeywords(entry: CatalogEntry): string[] {
  return [entry.ref.modelId, entry.ref.provider, entry.family];
}

export function modelAccessories(entry: CatalogEntry, isFavorite: boolean): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (isFavorite) accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" });
  if (entry.pricing) {
    const { inputPerMTok, outputPerMTok } = entry.pricing;
    accessories.push({ text: `$${inputPerMTok} / $${outputPerMTok}`, tooltip: "USD per million tokens, in / out" });
  }
  accessories.push({ tag: PROVIDER_LABELS[entry.ref.provider] });
  return accessories;
}

interface ModelPickerProps {
  title: string;
  onPick: (ref: ModelRef) => void | Promise<void>;
  /** Adds a second action, for example to store the choice in the prompt. */
  onPickAndSave?: (ref: ModelRef) => void | Promise<void>;
  saveTitle?: string;
}

export function ModelPicker({ title, onPick, onPickAndSave, saveTitle }: ModelPickerProps) {
  const { entries, favorites, problems, isLoading, refresh } = useCatalog();
  const { pop } = useNavigation();
  const groups = useMemo(() => groupByFamily(entries, favorites), [entries, favorites]);

  async function pick(handler: (ref: ModelRef) => void | Promise<void>, ref: ModelRef) {
    pop();
    try {
      await handler(ref);
    } catch (error) {
      await showError("Cannot Use Model", error);
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={title} searchBarPlaceholder="Search models">
      {groups.map((group) => (
        <List.Section key={group.title} title={group.title}>
          {group.entries.map((entry) => (
            <List.Item
              key={refKey(entry.ref)}
              title={entry.displayName}
              keywords={modelKeywords(entry)}
              accessories={modelAccessories(entry, group.isFavorites)}
              actions={
                <ActionPanel>
                  <Action title="Use Model" icon={Icon.Checkmark} onAction={() => pick(onPick, entry.ref)} />
                  {onPickAndSave && (
                    <Action
                      title={saveTitle ?? "Use and Save"}
                      icon={Icon.SaveDocument}
                      onAction={() => pick(onPickAndSave, entry.ref)}
                    />
                  )}
                  <Action title="Refresh Models" icon={Icon.ArrowClockwise} onAction={refresh} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {!isLoading && (
        <List.EmptyView
          icon={problems.length > 0 ? { source: Icon.Warning, tintColor: Color.Orange } : undefined}
          title={problems.length > 0 ? "Models Could Not Be Loaded" : "No Models"}
          description={problems.length > 0 ? problems.join("\n") : "Add an API key in the preferences, then refresh."}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Models"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refresh}
              />
              <Action title="Open Extension Preferences" icon={Icon.Key} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
