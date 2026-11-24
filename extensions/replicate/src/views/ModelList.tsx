import { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { chatShape } from "../lib/chat";
import { MAIN_COLLECTIONS, modelId } from "../lib/replicate";
import { Model } from "../types";
import { useAIModels } from "../hooks/useAIModels";
import { useCollections } from "../hooks/useCollections";
import { useModel } from "../hooks/useModel";
import { useModels } from "../hooks/useModels";
import { useRecentModels } from "../hooks/useRecentModels";
import { formatRuns } from "../utils/format";
import { ModelDetailPane } from "./ModelDetailPane";
import { ModelForm } from "./ModelForm";

export const ModelList = () => {
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: models = [], isLoading } = useModels(query, collection);
  const { data: collections = [] } = useCollections();
  const { recents, remember } = useRecentModels();
  const { data: full } = useModel(selected ?? undefined);
  const aiModels = useAIModels();

  const searching = Boolean(query.trim());
  const recentIds = new Set(recents.map(modelId));
  const shown = searching ? models : models.filter((model) => !recentIds.has(modelId(model)));
  const pinned = searching ? [] : recents;
  // Without a selection to hold, resolving the highlighted model re-renders the list back to row one.
  const visible = new Set([...pinned, ...shown].map(modelId));

  const item = (model: Model) => {
    const id = modelId(model);
    const runs = formatRuns(model.run_count);
    const example = selected === id ? full?.default_example?.input?.prompt?.trim() : undefined;
    const inAI = aiModels.keptIds.includes(id);
    // A listed model may lack its schema, so the highlighted row's fetched model decides.
    const chattable = Boolean(chatShape(selected === id ? full : model.latest_version ? model : undefined));
    return (
      <List.Item
        key={id}
        id={id}
        icon={model.cover_image_url ?? Icon.Box}
        title={id}
        accessories={runs ? [{ text: runs }] : undefined}
        detail={<ModelDetailPane model={model} full={selected === id ? full : undefined} />}
        actions={
          <ActionPanel>
            <Action.Push
              icon={Icon.Play}
              title="Configure Inputs"
              target={<ModelForm model={model} onOpen={remember} />}
            />
            <Action.OpenInBrowser icon={Icon.Globe} title="Open on Replicate" url={`https://replicate.com/${id}`} />
            <Action.CopyToClipboard icon={Icon.Text} title="Copy Model Name" content={id} />
            {example && <Action.CopyToClipboard icon={Icon.Paragraph} title="Copy Example Prompt" content={example} />}
            {inAI ? (
              <Action icon={Icon.MinusCircle} title="Remove from Raycast AI" onAction={() => aiModels.remove(id)} />
            ) : (
              chattable && <Action icon={Icon.PlusCircle} title="Add to Raycast AI" onAction={() => aiModels.add(id)} />
            )}
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      selectedItemId={selected && visible.has(selected) ? selected : undefined}
      onSelectionChange={setSelected}
      throttle
      searchBarPlaceholder="Search Replicate models"
      searchBarAccessory={
        <List.Dropdown tooltip="Collection" storeValue onChange={setCollection}>
          <List.Dropdown.Item title="Most Run" value="" />
          {[...collections]
            .sort((first, second) => {
              const rank = (slug: string) => {
                const index = MAIN_COLLECTIONS.indexOf(slug);
                return index === -1 ? MAIN_COLLECTIONS.length : index;
              };
              return rank(first.slug) - rank(second.slug) || first.name.localeCompare(second.name);
            })
            .map((entry) => (
              <List.Dropdown.Item key={entry.slug} title={entry.name} value={entry.slug} />
            ))}
        </List.Dropdown>
      }
    >
      {pinned.length > 0 && <List.Section title="Recent">{pinned.map(item)}</List.Section>}
      <List.Section
        title={searching ? "Results" : (collections.find((c) => c.slug === collection)?.name ?? "Most Run")}
      >
        {shown.map(item)}
      </List.Section>
    </List>
  );
};
