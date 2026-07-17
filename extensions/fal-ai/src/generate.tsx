import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  LaunchType,
  List,
  Toast,
  getPreferenceValues,
  launchCommand,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getModel, searchModels, submitGeneration } from "./api";
import { inferMediaType } from "./media";
import {
  extractInputFields,
  getPrompt,
  parseFormValues,
  splitFields,
} from "./schema";
import {
  getFavoriteModels,
  getHistory,
  getRecentModels,
  toggleFavoriteModel,
  upsertRecord,
} from "./storage";
import { FalModel, GenerationRecord, SchemaField } from "./types";

type ModelFilter =
  | "all"
  | "favorites"
  | "recent"
  | "text-to-image"
  | "image-to-image"
  | "text-to-video"
  | "image-to-video"
  | "audio"
  | "video"
  | "3d";

export default function GenerateCommand() {
  const preferences = getPreferenceValues<Preferences.Generate>();
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<ModelFilter>("all");
  const [models, setModels] = useState<FalModel[]>([]);
  const [favoriteModels, setFavoriteModels] = useState<string[]>([]);
  const [recentModels, setRecentModels] = useState<string[]>([]);
  const [savedModels, setSavedModels] = useState<FalModel[]>([]);
  const [latestRecords, setLatestRecords] = useState<GenerationRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  async function reloadPreferences() {
    const [favorites, recent, history] = await Promise.all([
      getFavoriteModels(),
      getRecentModels(),
      getHistory(),
    ]);
    setFavoriteModels(favorites);
    setRecentModels(recent);
    setLatestRecords(history.slice(0, 3));

    const endpoints = [...new Set([...favorites, ...recent])].slice(0, 20);
    const loaded = await Promise.allSettled(
      endpoints.map((endpointId) => getModel(endpointId)),
    );
    setSavedModels(
      loaded
        .map((result) =>
          result.status === "fulfilled" ? result.value : undefined,
        )
        .filter((model): model is FalModel => Boolean(model)),
    );
  }

  useEffect(() => {
    if (!preferences.apiKey?.trim()) return;
    reloadPreferences();
  }, [preferences.apiKey]);

  useEffect(() => {
    if (!preferences.apiKey?.trim()) return;
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      setError(undefined);
      try {
        const response = await searchModels(searchText);
        setModels(response.models);
        setNextCursor(response.has_more ? response.next_cursor : null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setNextCursor(null);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [preferences.apiKey, searchText]);

  async function loadMoreModels() {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const response = await searchModels(searchText, nextCursor);
      setModels((current) => dedupeModels([...current, ...response.models]));
      setNextCursor(response.has_more ? response.next_cursor : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setNextCursor(null);
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (!preferences.apiKey?.trim()) {
    return (
      <Detail markdown="Add your fal API key in the extension preferences before generating." />
    );
  }

  const visibleModels = getVisibleModels({
    filter,
    models,
    savedModels,
    favoriteModels,
    recentModels,
  });
  const favorites = visibleModels.filter((model) =>
    favoriteModels.includes(model.endpoint_id),
  );
  const recent = visibleModels.filter(
    (model) =>
      recentModels.includes(model.endpoint_id) &&
      !favoriteModels.includes(model.endpoint_id),
  );
  const remaining = visibleModels.filter(
    (model) =>
      !favoriteModels.includes(model.endpoint_id) &&
      !recentModels.includes(model.endpoint_id),
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search models or paste an endpoint ID..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Model Type"
          value={filter}
          onChange={(value) => setFilter(value as ModelFilter)}
        >
          <List.Dropdown.Item title="All Models" value="all" />
          <List.Dropdown.Item title="Favorites" value="favorites" />
          <List.Dropdown.Item title="Recently Used" value="recent" />
          <List.Dropdown.Item title="Text to Image" value="text-to-image" />
          <List.Dropdown.Item title="Image to Image" value="image-to-image" />
          <List.Dropdown.Item title="Text to Video" value="text-to-video" />
          <List.Dropdown.Item title="Image to Video" value="image-to-video" />
          <List.Dropdown.Item title="Audio" value="audio" />
          <List.Dropdown.Item title="Video" value="video" />
          <List.Dropdown.Item title="3D" value="3d" />
        </List.Dropdown>
      }
      pagination={{
        pageSize: 25,
        hasMore: Boolean(nextCursor),
        onLoadMore: () => {
          void loadMoreModels();
        },
      }}
      throttle
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load fal models"
          description={error}
        />
      ) : (
        <>
          {!searchText && latestRecords.length ? (
            <LatestGenerationSection records={latestRecords} />
          ) : null}
          {isEndpointId(searchText) ? (
            <ManualModelItem endpointId={searchText.trim()} />
          ) : null}
          {favorites.length ? (
            <ModelSection
              title="Favorite Models"
              models={favorites}
              favoriteModels={favoriteModels}
              onFavoritesChanged={reloadPreferences}
            />
          ) : null}
          {recent.length ? (
            <ModelSection
              title="Recently Used Models"
              models={sortByEndpointOrder(recent, recentModels)}
              favoriteModels={favoriteModels}
              onFavoritesChanged={reloadPreferences}
            />
          ) : null}
          <ModelSection
            title={modelSectionTitle(filter)}
            models={remaining}
            favoriteModels={favoriteModels}
            onFavoritesChanged={reloadPreferences}
          />
        </>
      )}
    </List>
  );
}

function LatestGenerationSection({ records }: { records: GenerationRecord[] }) {
  return (
    <List.Section title="Latest Generations">
      {records.map((record) => {
        const mediaUrl = record.mediaUrls[0];
        return (
          <List.Item
            key={record.id}
            icon={mediaUrl ? mediaIcon(mediaUrl) : statusIcon(record.status)}
            title={record.prompt || record.title}
            subtitle={record.endpointId}
            accessories={[
              {
                text: statusLabel(record),
                icon: statusAccessory(record.status),
              },
              { date: new Date(record.createdAt) },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Open Generated Assets"
                  icon={Icon.Clock}
                  onAction={() =>
                    launchCommand({
                      name: "history",
                      type: LaunchType.UserInitiated,
                    })
                  }
                />
                {mediaUrl ? (
                  <Action.OpenInBrowser title="Open Asset" url={mediaUrl} />
                ) : null}
                {mediaUrl ? (
                  <Action.CopyToClipboard
                    title="Copy Asset URL"
                    content={mediaUrl}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}

function ModelSection({
  title,
  models,
  favoriteModels,
  onFavoritesChanged,
}: {
  title: string;
  models: FalModel[];
  favoriteModels: string[];
  onFavoritesChanged: () => Promise<void>;
}) {
  if (!models.length) return null;

  return (
    <List.Section title={title}>
      {models.map((model) => (
        <ModelItem
          key={model.endpoint_id}
          model={model}
          isFavorite={favoriteModels.includes(model.endpoint_id)}
          onFavoritesChanged={onFavoritesChanged}
        />
      ))}
    </List.Section>
  );
}

function ManualModelItem({ endpointId }: { endpointId: string }) {
  const { push } = useNavigation();
  return (
    <List.Item
      icon={Icon.Terminal}
      title={`Use ${endpointId}`}
      subtitle="Custom endpoint ID"
      accessories={[{ text: "Manual" }]}
      actions={
        <ActionPanel>
          <Action
            title="Use Endpoint"
            icon={Icon.ArrowRight}
            onAction={() => push(<GenerationForm endpointId={endpointId} />)}
          />
        </ActionPanel>
      }
    />
  );
}

function ModelItem({
  model,
  isFavorite,
  onFavoritesChanged,
}: {
  model: FalModel;
  isFavorite: boolean;
  onFavoritesChanged: () => Promise<void>;
}) {
  const { push } = useNavigation();
  const metadata = model.metadata ?? {};
  const category = normalizeCategory(metadata.category);

  async function toggleFavorite() {
    await toggleFavoriteModel(model.endpoint_id);
    await onFavoritesChanged();
  }

  return (
    <List.Item
      icon={
        metadata.thumbnail_url ? { source: metadata.thumbnail_url } : Icon.Image
      }
      title={metadata.display_name || model.endpoint_id}
      subtitle={model.endpoint_id}
      keywords={[
        model.endpoint_id,
        metadata.display_name,
        metadata.category,
        ...(metadata.tags ?? []),
      ].filter((entry): entry is string => Boolean(entry))}
      accessories={[
        category
          ? { tag: { value: category, color: Color.SecondaryText } }
          : {},
        isFavorite ? { icon: Icon.Star, tooltip: "Favorite" } : {},
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Use Model"
            icon={Icon.ArrowRight}
            onAction={() =>
              push(<GenerationForm endpointId={model.endpoint_id} />)
            }
          />
          <Action
            title={isFavorite ? "Remove Favorite" : "Add Favorite"}
            icon={isFavorite ? Icon.StarDisabled : Icon.Star}
            onAction={toggleFavorite}
          />
          {metadata.model_url ? (
            <Action.OpenInBrowser
              title="Open Model Page"
              url={metadata.model_url}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Endpoint ID"
            content={model.endpoint_id}
          />
        </ActionPanel>
      }
    />
  );
}

function GenerationForm({ endpointId }: { endpointId: string }) {
  const [model, setModel] = useState<FalModel>();
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadModel() {
      setIsLoading(true);
      try {
        const loadedModel = await getModel(endpointId);
        if (!mounted) return;
        setModel(loadedModel);
        setFields(extractInputFields(loadedModel?.openapi));
      } catch {
        if (!mounted) return;
        setFields(extractInputFields(undefined));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadModel();
    return () => {
      mounted = false;
    };
  }, [endpointId]);

  const title = model?.metadata?.display_name || endpointId;
  const fieldGroups = useMemo(() => splitFields(fields), [fields]);

  async function handleSubmit(values: Record<string, unknown>) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting generation",
      message: title,
    });

    try {
      const input = parseFormValues(fields, values);
      const response = await submitGeneration(endpointId, input);
      const now = new Date().toISOString();
      const record = {
        id: response.request_id,
        endpointId,
        title,
        prompt: getPrompt(input),
        input,
        status: "IN_QUEUE" as const,
        queuePosition: response.queue_position,
        responseUrl: response.response_url,
        statusUrl: response.status_url,
        cancelUrl: response.cancel_url,
        mediaUrls: [],
        createdAt: now,
        updatedAt: now,
      };

      await upsertRecord(record);
      toast.style = Toast.Style.Success;
      toast.title = "Generation queued";
      toast.message = response.queue_position
        ? `Queue position ${response.queue_position} · ${response.request_id}`
        : response.request_id;
      await popToRoot();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Generation failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  if (isLoading)
    return (
      <Detail isLoading markdown={`Loading schema for \`${endpointId}\`...`} />
    );

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Generation"
            icon={Icon.Upload}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={modelSummary(model, endpointId)} />
      {fieldGroups.required.length ? (
        <>
          <Form.Description text="Required input" />
          {fieldGroups.required.map((field) => (
            <SchemaFieldInput key={field.name} field={field} />
          ))}
          <Form.Separator />
        </>
      ) : null}
      {fieldGroups.optional.length ? (
        <>
          <Form.Description text="Optional settings" />
          {fieldGroups.optional.map((field) => (
            <SchemaFieldInput key={field.name} field={field} />
          ))}
          <Form.Separator />
        </>
      ) : null}
      {fieldGroups.advanced.length ? (
        <>
          <Form.Description text="Advanced schema fields" />
          {fieldGroups.advanced.map((field) => (
            <SchemaFieldInput key={field.name} field={field} />
          ))}
          <Form.Separator />
        </>
      ) : null}
      <Form.Description text="Advanced JSON overrides" />
      <Form.TextArea
        id="rawJson"
        title="Raw JSON Overrides"
        placeholder={
          '{"guidance_scale": 3.5, "image_size": {"width": 1024, "height": 1024}}'
        }
        info="Optional. Merged into the request after form values, useful for arrays, nested objects, or new model params."
      />
    </Form>
  );
}

function SchemaFieldInput({ field }: { field: SchemaField }) {
  const requirement = field.required ? "Required" : "Optional";
  const info = [requirement, field.description].filter(Boolean).join("\n");
  const placeholder =
    field.defaultValue !== undefined
      ? String(field.defaultValue)
      : field.required
        ? "Required"
        : "Optional";
  const title = `${field.title} ${field.required ? "*" : ""}`;

  if (field.kind === "boolean") {
    return (
      <Form.Checkbox
        id={field.name}
        title={title}
        label={field.description ?? field.name}
        info={info}
        defaultValue={Boolean(field.defaultValue)}
      />
    );
  }

  if (field.kind === "enum" && field.enumOptions?.length) {
    return (
      <Form.Dropdown
        id={field.name}
        title={title}
        info={info}
        defaultValue={
          field.defaultValue !== undefined
            ? field.enumOptions.find(
                (option) => option.rawValue === field.defaultValue,
              )?.value
            : undefined
        }
      >
        {!field.required ? (
          <Form.Dropdown.Item value="" title="Default" />
        ) : null}
        {field.enumOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>
    );
  }

  if (field.kind === "json") {
    return (
      <Form.TextArea
        id={field.name}
        title={title}
        info={info}
        placeholder={placeholder}
      />
    );
  }

  if (field.name === "prompt" || field.name.includes("prompt")) {
    return (
      <Form.TextArea
        id={field.name}
        title={title}
        info={info}
        placeholder={placeholder}
      />
    );
  }

  return (
    <Form.TextField
      id={field.name}
      title={title}
      info={info}
      placeholder={placeholder}
    />
  );
}

function getVisibleModels({
  filter,
  models,
  savedModels,
  favoriteModels,
  recentModels,
}: {
  filter: ModelFilter;
  models: FalModel[];
  savedModels: FalModel[];
  favoriteModels: string[];
  recentModels: string[];
}) {
  const combined = dedupeModels([...savedModels, ...models]);

  if (filter === "favorites") {
    return combined.filter((model) =>
      favoriteModels.includes(model.endpoint_id),
    );
  }

  if (filter === "recent") {
    return sortByEndpointOrder(
      combined.filter((model) => recentModels.includes(model.endpoint_id)),
      recentModels,
    );
  }

  if (filter === "all") return combined;

  return combined.filter((model) => modelMatchesFilter(model, filter));
}

function dedupeModels(models: FalModel[]) {
  const seen = new Set<string>();
  return models.filter((model) => {
    if (seen.has(model.endpoint_id)) return false;
    seen.add(model.endpoint_id);
    return true;
  });
}

function sortByEndpointOrder(models: FalModel[], endpoints: string[]) {
  return [...models].sort(
    (a, b) =>
      endpoints.indexOf(a.endpoint_id) - endpoints.indexOf(b.endpoint_id),
  );
}

function modelMatchesFilter(model: FalModel, filter: ModelFilter) {
  const haystack = [
    model.endpoint_id,
    model.metadata?.category,
    model.metadata?.description,
    ...(model.metadata?.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (filter === "audio") return haystack.includes("audio");
  if (filter === "video") return haystack.includes("video");
  if (filter === "3d")
    return haystack.includes("3d") || haystack.includes("3-d");
  return haystack.includes(filter);
}

function modelSectionTitle(filter: ModelFilter) {
  if (filter === "all") return "All Models";
  if (filter === "favorites") return "Other Favorite Matches";
  if (filter === "recent") return "Other Recent Matches";
  return normalizeCategory(filter) ?? "Models";
}

function normalizeCategory(value?: string) {
  if (!value) return undefined;
  return value
    .split("-")
    .map((part) =>
      part === "3d" ? "3D" : part[0]?.toUpperCase() + part.slice(1),
    )
    .join(" ");
}

function modelSummary(model: FalModel | undefined, endpointId: string) {
  const metadata = model?.metadata;
  const category = normalizeCategory(metadata?.category);
  return [metadata?.display_name ?? endpointId, category]
    .filter(Boolean)
    .join("\n");
}

function isEndpointId(value: string) {
  return /^[\w-]+\/[\w./-]+$/.test(value.trim());
}

function statusLabel(record: GenerationRecord) {
  if (record.error) return record.error;
  if (record.status === "COMPLETED") return "Completed";
  if (record.status === "IN_PROGRESS") return "Running";
  if (record.status === "IN_QUEUE" && record.queuePosition !== undefined)
    return `Queued #${record.queuePosition}`;
  return record.status.replace(/_/g, " ").toLowerCase();
}

function statusIcon(status: string) {
  if (status === "COMPLETED") return Icon.CheckCircle;
  if (status === "FAILED") return Icon.XMarkCircle;
  if (status === "IN_PROGRESS") return Icon.Gear;
  return Icon.Clock;
}

function statusAccessory(status: string) {
  if (status === "COMPLETED")
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  if (status === "FAILED")
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  if (status === "IN_PROGRESS")
    return { source: Icon.Gear, tintColor: Color.Blue };
  return { source: Icon.Clock, tintColor: Color.SecondaryText };
}

function mediaIcon(url: string) {
  const type = inferMediaType(url);
  if (type === "image") return { source: url };
  if (type === "video") return Icon.Video;
  if (type === "audio") return Icon.SpeakerOn;
  if (type === "3d") return Icon.Box;
  return Icon.Document;
}
