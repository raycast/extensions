import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";
import { Chat } from "./components/chat";
import { ModelForm } from "./components/model-form";
import {
  anyModelJob,
  EDIT_OPERATIONS,
  GENERATE_IMAGE,
  GENERATE_MUSIC,
  GENERATE_SPEECH,
  GENERATE_VIDEO_FROM_IMAGE,
  GENERATE_VIDEO_FROM_TEXT,
  TRANSCRIBE_AUDIO,
  type Job,
} from "./lib/catalog";
import { isListedModel } from "./lib/params";
import { startingPrice, startingPriceText } from "./lib/price";
import { formatUsd, listModels, modelPageUrl, modelSlug, type WiroModel } from "./lib/wiro";

const PAGE_SIZE = 30;

const CATEGORIES: Array<[string, string]> = [
  ["text-to-image", "Text to Image"],
  ["image-to-image", "Image to Image"],
  ["image-editing", "Image Editing"],
  ["upscale", "Upscale"],
  ["background-removal", "Background Removal"],
  ["restoration", "Photo Restoration"],
  ["text-to-video", "Text to Video"],
  ["image-to-video", "Image to Video"],
  ["video-to-video", "Video to Video"],
  ["talking-head", "Talking Head"],
  ["text-to-speech", "Text to Speech"],
  ["speech-to-text", "Speech to Text"],
  ["text-to-music", "Text to Music"],
  ["text-to-song", "Text to Song"],
  ["voice-clone", "Voice Clone"],
  ["3d-generation", "3D Generation"],
  ["llm", "LLM"],
  ["llm-tool-call", "LLM Gateway"],
];

/** The command form that fits a model best, from its categories; Run Model fits every model. */
function suggestedForm(categories: string[]): { title: string; icon: Icon; jobs: Job[]; jobId?: string } | undefined {
  const has = (id: string) => categories.includes(id);
  if (has("text-to-image")) return { title: "Generate Image", icon: Icon.Image, jobs: [GENERATE_IMAGE] };
  const edit = EDIT_OPERATIONS.find((operation) => operation.job.categories.some(has));
  if (edit) {
    return {
      title: edit.job.title,
      icon: Icon.Brush,
      jobs: EDIT_OPERATIONS.map((operation) => operation.job),
      jobId: edit.job.id,
    };
  }
  if (has("text-to-video") || has("image-to-video")) {
    return {
      title: "Generate Video",
      icon: Icon.Video,
      jobs: [GENERATE_VIDEO_FROM_TEXT, GENERATE_VIDEO_FROM_IMAGE],
      jobId: has("text-to-video") ? GENERATE_VIDEO_FROM_TEXT.id : GENERATE_VIDEO_FROM_IMAGE.id,
    };
  }
  if (has("text-to-speech")) return { title: "Generate Speech", icon: Icon.SpeechBubble, jobs: [GENERATE_SPEECH] };
  if (has("text-to-music") || has("text-to-song"))
    return { title: "Generate Music", icon: Icon.Music, jobs: [GENERATE_MUSIC] };
  if (has("speech-to-text")) return { title: "Transcribe Audio", icon: Icon.Microphone, jobs: [TRANSCRIBE_AUDIO] };
  return undefined;
}
const CATEGORY_LABELS = new Map(CATEGORIES);

function categoryLabels(model: WiroModel): string[] {
  return (model.categories ?? [])
    .map((id) => CATEGORY_LABELS.get(id))
    .filter((label): label is string => Boolean(label));
}

function runCount(model: WiroModel): number | undefined {
  const count = Number(model.taskstat?.runcount);
  return Number.isFinite(count) && count > 0 ? count : undefined;
}

function ModelDetail({ model }: { model: WiroModel }) {
  const slug = modelSlug(model);
  const labels = categoryLabels(model);
  const price = startingPriceText(model);
  const runs = runCount(model);
  const description = (model.description || model.seodescription || "").trim();
  const markdown = [model.image ? `![${model.title}](${model.image})` : "", `**${model.title}**`, description]
    .filter(Boolean)
    .join("\n\n");
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Model ID" text={slug} />
          {labels.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Categories">
              {labels.map((label) => (
                <List.Item.Detail.Metadata.TagList.Item key={label} text={label} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          {model.computingtime && (
            <List.Item.Detail.Metadata.Label title="Typical Run Time" text={model.computingtime} />
          )}
          {runs && <List.Item.Detail.Metadata.Label title="Runs" text={runs.toLocaleString("en-US")} />}
          {price && <List.Item.Detail.Metadata.Label title="Price" text={price} />}
          <List.Item.Detail.Metadata.Link title="Model Page" text="wiro.ai" target={modelPageUrl(slug)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function SearchModels() {
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useCachedState<string>("search-category", "");
  const [showingDetail, setShowingDetail] = useCachedState<boolean>("search-detail", true);

  const { data, isLoading, error, pagination } = useCachedPromise(
    (search: string, filter: string) =>
      async ({ page }: { page: number }) => {
        const { models, total } = await listModels({
          search: search.trim(),
          categories: filter ? [filter] : [],
          start: page * PAGE_SIZE,
          limit: PAGE_SIZE,
        });
        return {
          data: models.filter((model) => isListedModel(modelSlug(model), model.title, model.description)),
          hasMore: (page + 1) * PAGE_SIZE < total,
        };
      },
    [searchText, category],
    { keepPreviousData: true },
  );

  const models = data ?? [];
  // Read apart from isLoading, so a failed load still shows its reason.
  const loadError: Error | undefined = error;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && models.length > 0}
      filtering={false}
      throttle
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search 1,000+ models by name, owner or task"
      pagination={pagination}
      searchBarAccessory={
        <List.Dropdown tooltip="Category" value={category} onChange={setCategory}>
          <List.Dropdown.Item value="" title="All Categories" />
          <List.Dropdown.Section>
            {CATEGORIES.map(([value, title]) => (
              <List.Dropdown.Item key={value} value={value} title={title} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading && models.length === 0 && loadError && (
        <List.EmptyView icon={Icon.Warning} title="Could not load models" description={loadError.message} />
      )}
      {!isLoading && models.length === 0 && !loadError && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No models found"
          description="Try another word or category."
        />
      )}
      {models.map((model) => {
        const slug = modelSlug(model);
        const categories = model.categories ?? [];
        const suggested = suggestedForm(categories);
        const onGateway = categories.includes("llm-tool-call");
        const lowest = startingPrice(model)?.amount;
        const firstLabel = categoryLabels(model)[0];
        return (
          <List.Item
            key={model.id}
            id={model.id}
            icon={model.image ? { source: model.image } : Icon.Stars}
            title={slug}
            subtitle={showingDetail ? undefined : model.title}
            keywords={[model.title]}
            accessories={
              showingDetail
                ? undefined
                : [
                    ...(firstLabel ? [{ tag: firstLabel }] : []),
                    ...(lowest !== undefined ? [{ text: `from ${formatUsd(lowest)}` }] : []),
                  ]
            }
            detail={<ModelDetail model={model} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="Open Model Page" url={modelPageUrl(slug)} />
                  {suggested && (
                    <Action.Push
                      title={suggested.title}
                      icon={suggested.icon}
                      target={<ModelForm jobs={suggested.jobs} initialJobId={suggested.jobId} initialModel={slug} />}
                    />
                  )}
                  <Action.Push
                    title="Run Model"
                    icon={Icon.Play}
                    target={<ModelForm jobs={[anyModelJob()]} initialModel={slug} />}
                  />
                  {onGateway && (
                    <Action.Push title="Ask AI" icon={Icon.Message} target={<Chat initialModel={slug} />} />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Model ID"
                    content={slug}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.CopyToClipboard title="Copy Model Page URL" content={modelPageUrl(slug)} />
                  <Action
                    title={showingDetail ? "Hide Details" : "Show Details"}
                    icon={Icon.Sidebar}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    onAction={() => setShowingDetail(!showingDetail)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
