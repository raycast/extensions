import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactElement, useState } from "react";
import { useAIModels } from "../hooks/useAIModels";
import { fullModel, KeptModel, popularModelIds } from "../lib/ai-models";
import { chatShape } from "../lib/chat";
import { errorMessage, modelId, searchModels } from "../lib/replicate";
import { Model } from "../types";
import { formatAgo } from "../utils/format";
import { AIModelDetail } from "./AIModelDetail";
import { ChatDefaultsForm } from "./ChatDefaultsForm";

const loadDetails = async (ids: string[]) => {
  const models = await Promise.all(ids.map((id) => fullModel(id).catch(() => undefined)));
  return Object.fromEntries(ids.map((id, index) => [id, models[index]])) as Record<string, Model | undefined>;
};

const activity = (model: KeptModel) => Math.max(model.usedAt ?? 0, model.addedAt ?? 0);

const lastActivity = (model: KeptModel): List.Item.Accessory[] => {
  const [label, time] = model.usedAt ? ["Used", model.usedAt] : ["Added", model.addedAt];
  return time ? [{ text: `${label} ${formatAgo(time)}`, tooltip: new Date(time).toLocaleString() }] : [];
};

export const ManageAIModels = () => {
  const [query, setQuery] = useState("");
  const { popularModels } = getPreferenceValues<Preferences>();
  const { kept, keptIds, hidden, isLoading, revalidate, add, remove, hide, unhide } = useAIModels();
  const { data: popular = [], isLoading: loadingPopular } = usePromise(popularModelIds, [], {
    execute: popularModels,
  });

  const popularIds = popularModels ? popular : [];
  const shownPopular = popularIds.filter((id) => !keptIds.includes(id) && !hidden.includes(id));
  const listed = [...keptIds, ...shownPopular, ...hidden];
  const { data: details = {} } = usePromise(loadDetails, [listed]);

  const search = query.trim();
  const { data: results = [], isLoading: searching } = usePromise(searchModels, [search], {
    execute: Boolean(search),
  });
  const found = search ? results.filter((model) => !listed.includes(modelId(model))) : [];
  // Search results leave out is_official, which only the full model carries.
  const { data: foundDetails = {} } = usePromise(loadDetails, [found.map(modelId)]);

  const needle = search.toLowerCase();
  const matches = (id: string) =>
    !needle || id.toLowerCase().includes(needle) || Boolean(details[id]?.description?.toLowerCase().includes(needle));

  const addResult = async (id: string) => {
    try {
      if (!chatShape(await fullModel(id))) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Can't Add to Raycast AI",
          message: `${id} returns output that a chat can't show, such as video or audio.`,
        });
        return;
      }
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could Not Load the Model", message: errorMessage(error) });
      return;
    }
    await add(id);
  };

  const common = (id: string) => (
    <>
      <Action.OpenInBrowser icon={Icon.Globe} title="Open on Replicate" url={`https://replicate.com/${id}`} />
      <Action.CopyToClipboard icon={Icon.Text} title="Copy Model Name" content={id} />
    </>
  );

  const settings = (model?: Model) =>
    model && chatShape(model) ? (
      <ActionPanel.Section>
        <Action.Push icon={Icon.Gear} title="Set Chat Defaults" target={<ChatDefaultsForm model={model} />} />
      </ActionPanel.Section>
    ) : null;

  const item = (
    id: string,
    model: Model | undefined,
    actions: ReactElement,
    { accessories = [], inPicker = false }: { accessories?: List.Item.Accessory[]; inPicker?: boolean } = {},
  ) => (
    <List.Item
      key={id}
      icon={model?.cover_image_url ?? Icon.Box}
      title={id}
      subtitle={model?.description}
      accessories={[...accessories, ...(model?.is_official ? [{ tag: "Official" }] : [])]}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Sidebar}
            title="Show Details"
            target={<AIModelDetail id={id} popular={popularIds} />}
            onPop={revalidate}
          />
          {actions}
          {common(id)}
          {inPicker && settings(model)}
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading || loadingPopular || searching}
      searchBarPlaceholder="Search Replicate models"
      onSearchTextChange={setQuery}
      throttle
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      {search && searching ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Searching Replicate…" />
      ) : isLoading || loadingPopular ? null : (
        <List.EmptyView
          icon={Icon.Stars}
          title={search ? "No Models Found" : "No Models in Raycast AI"}
          description={
            search
              ? "Try a different search, or browse collections in Run a Model."
              : "Search Replicate's models and add the ones you want in the model picker."
          }
        />
      )}
      <List.Section>
        {[...kept]
          .sort((first, second) => activity(second) - activity(first))
          .filter((model) => matches(model.id))
          .map((model) =>
            item(
              model.id,
              details[model.id],
              <Action icon={Icon.MinusCircle} title="Remove from Raycast AI" onAction={() => remove(model.id)} />,
              { accessories: lastActivity(model), inPicker: true },
            ),
          )}
        {shownPopular.filter(matches).map((id) =>
          item(
            id,
            details[id],
            <>
              <Action icon={Icon.EyeDisabled} title="Hide from Raycast AI" onAction={() => hide(id)} />
              <Action icon={Icon.Pin} title="Keep in Raycast AI" onAction={() => add(id)} />
            </>,
            { inPicker: true },
          ),
        )}
      </List.Section>
      <List.Section title="Hidden">
        {hidden
          .filter(matches)
          .map((id) =>
            item(id, details[id], <Action icon={Icon.Eye} title="Show in Raycast AI" onAction={() => unhide(id)} />),
          )}
      </List.Section>
      <List.Section title="Replicate">
        {found.map((model) => {
          const id = modelId(model);
          return item(
            id,
            foundDetails[id] ?? model,
            <Action icon={Icon.PlusCircle} title="Add to Raycast AI" onAction={() => addResult(id)} />,
          );
        })}
      </List.Section>
    </List>
  );
};
