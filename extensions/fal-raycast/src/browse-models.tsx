import {
  Action,
  ActionPanel,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { getModelsByEndpointIds, modelLabel, searchModels } from "./fal";
import {
  DEFAULT_IMAGE_MODEL_KEY,
  DEFAULT_NO_IMAGE_MODEL_KEY,
  LEGACY_DEFAULT_MODEL_KEY,
} from "./model-defaults";
import { ModelRunForm } from "./model-run-form";
import { ModelEndpoint } from "./types";

const FAVORITE_MODELS_KEY = "favorite-model-endpoints";

async function loadFavoriteModelIds() {
  const raw = await LocalStorage.getItem<string>(FAVORITE_MODELS_KEY);
  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

async function saveFavoriteModelIds(endpointIds: string[]) {
  await LocalStorage.setItem(FAVORITE_MODELS_KEY, JSON.stringify(endpointIds));
}

function modelDetailMarkdown(model: ModelEndpoint) {
  const title = modelLabel(model);
  const modelPageUrl = getPublicModelUrl(model.endpoint_id);
  return `# ${title}\n\n- Endpoint: \`${model.endpoint_id}\`\n- Category: ${model.metadata?.category || "n/a"}\n- Public Page: ${modelPageUrl}\n\n${model.metadata?.description || ""}`;
}

function getPublicModelUrl(endpointId: string) {
  const encodedEndpointPath = endpointId
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://fal.ai/models/${encodedEndpointPath}`;
}

type ModelListItemProps = {
  favorite: boolean;
  model: ModelEndpoint;
  onSetDefaultImageModel: (endpointId: string) => Promise<void>;
  onSetDefaultNoImageModel: (endpointId: string) => Promise<void>;
  onToggleFavorite: (endpointId: string, favorite: boolean) => Promise<void>;
};

function ModelListItem(props: ModelListItemProps) {
  const {
    model,
    favorite,
    onSetDefaultImageModel,
    onSetDefaultNoImageModel,
    onToggleFavorite,
  } = props;
  const title = modelLabel(model);
  const subtitle = model.metadata?.category || "unknown";
  const accessories = [{ tag: model.metadata?.status || "active" }];
  const modelPageUrl = getPublicModelUrl(model.endpoint_id);

  return (
    <List.Item
      key={model.endpoint_id}
      title={title}
      subtitle={subtitle}
      accessories={accessories}
      icon={favorite ? Icon.Star : undefined}
      detail={<List.Item.Detail markdown={modelDetailMarkdown(model)} />}
      actions={
        <ActionPanel>
          <Action.Push
            title="Use Model"
            icon={Icon.Play}
            target={<ModelRunForm endpointId={model.endpoint_id} />}
          />
          <Action
            title={favorite ? "Remove Favorite" : "Add Favorite"}
            icon={favorite ? Icon.StarDisabled : Icon.Star}
            onAction={() => onToggleFavorite(model.endpoint_id, favorite)}
          />
          <Action
            title="Set as Default No-image Model"
            icon={Icon.Text}
            onAction={() => onSetDefaultNoImageModel(model.endpoint_id)}
          />
          <Action
            title="Set as Default Image-input Model"
            icon={Icon.Image}
            onAction={() => onSetDefaultImageModel(model.endpoint_id)}
          />
          <Action.CopyToClipboard
            content={model.endpoint_id}
            title="Copy Endpoint Id"
          />
          <Action.OpenInBrowser title="Open on Fal.ai" url={modelPageUrl} />
        </ActionPanel>
      }
    />
  );
}

type FavoritesOnlyListProps = {
  favoriteModels: ModelEndpoint[];
  onSetDefaultImageModel: (endpointId: string) => Promise<void>;
  onSetDefaultNoImageModel: (endpointId: string) => Promise<void>;
  onToggleFavorite: (endpointId: string, favorite: boolean) => Promise<void>;
};

function FavoritesOnlyList(props: FavoritesOnlyListProps) {
  return (
    <List isShowingDetail searchBarPlaceholder="Search favorite fal models">
      {props.favoriteModels.length === 0 ? (
        <List.EmptyView
          title="No Favorite Models"
          description="Use Add Favorite on any model to pin it here."
        />
      ) : null}
      {props.favoriteModels.map((model) => (
        <ModelListItem
          key={model.endpoint_id}
          model={model}
          favorite={true}
          onSetDefaultImageModel={props.onSetDefaultImageModel}
          onSetDefaultNoImageModel={props.onSetDefaultNoImageModel}
          onToggleFavorite={props.onToggleFavorite}
        />
      ))}
    </List>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [favoriteModelIds, setFavoriteModelIds] = useState<string[]>([]);

  const { data: storedFavoriteModelIds = [], isLoading: isLoadingFavorites } =
    useCachedPromise(loadFavoriteModelIds, []);

  useEffect(() => {
    setFavoriteModelIds(storedFavoriteModelIds);
  }, [storedFavoriteModelIds]);

  const { data, isLoading, error } = useCachedPromise(
    searchModels,
    [searchText],
    {
      keepPreviousData: true,
      initialData: { models: [], has_more: false },
    },
  );

  const { data: resolvedFavoriteModels = [] } = useCachedPromise(
    getModelsByEndpointIds,
    [favoriteModelIds],
    {
      execute: favoriteModelIds.length > 0,
      keepPreviousData: true,
      initialData: [],
    },
  );

  const models = useMemo(() => data?.models ?? [], [data]);
  const favoriteModelIdSet = useMemo(
    () => new Set(favoriteModelIds),
    [favoriteModelIds],
  );

  const favoriteModels = useMemo(() => {
    const byId = new Map(
      resolvedFavoriteModels.map((model) => [model.endpoint_id, model]),
    );
    return favoriteModelIds.map((endpointId) => {
      return byId.get(endpointId) || { endpoint_id: endpointId };
    });
  }, [favoriteModelIds, resolvedFavoriteModels]);

  async function setDefaultNoImageModel(endpointId: string) {
    await LocalStorage.setItem(DEFAULT_NO_IMAGE_MODEL_KEY, endpointId);
    await LocalStorage.setItem(LEGACY_DEFAULT_MODEL_KEY, endpointId);
    await showToast({
      style: Toast.Style.Success,
      title: `Default no-image model set to ${endpointId}`,
    });
  }

  async function setDefaultImageModel(endpointId: string) {
    await LocalStorage.setItem(DEFAULT_IMAGE_MODEL_KEY, endpointId);
    await showToast({
      style: Toast.Style.Success,
      title: `Default image-input model set to ${endpointId}`,
    });
  }

  async function toggleFavorite(endpointId: string, favorite: boolean) {
    const nextFavoriteModelIds = favorite
      ? favoriteModelIds.filter((id) => id !== endpointId)
      : [endpointId, ...favoriteModelIds.filter((id) => id !== endpointId)];

    setFavoriteModelIds(nextFavoriteModelIds);
    await saveFavoriteModelIds(nextFavoriteModelIds);
    await showToast({
      style: Toast.Style.Success,
      title: favorite ? "Removed from favorites" : "Added to favorites",
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search fal models"
      onSearchTextChange={setSearchText}
      throttle
      isShowingDetail
    >
      {error ? (
        <List.EmptyView
          title="Could not load models"
          description={String(error)}
          icon={Icon.ExclamationMark}
        />
      ) : null}

      <List.Item
        key="favorites-filter"
        title="Favorites"
        subtitle={`Show only favorites (${favoriteModels.length})`}
        icon={Icon.Star}
        detail={
          <List.Item.Detail markdown="Show a filtered list with only your favorite models." />
        }
        actions={
          <ActionPanel>
            <Action.Push
              title="Show Favorites"
              target={
                <FavoritesOnlyList
                  favoriteModels={favoriteModels}
                  onSetDefaultImageModel={setDefaultImageModel}
                  onSetDefaultNoImageModel={setDefaultNoImageModel}
                  onToggleFavorite={toggleFavorite}
                />
              }
            />
          </ActionPanel>
        }
      />

      <List.Section
        title="Models"
        subtitle={
          isLoadingFavorites
            ? "Loading favorites"
            : `${favoriteModelIds.length} favorites`
        }
      >
        {models.map((model) => (
          <ModelListItem
            key={model.endpoint_id}
            model={model}
            favorite={favoriteModelIdSet.has(model.endpoint_id)}
            onSetDefaultImageModel={setDefaultImageModel}
            onSetDefaultNoImageModel={setDefaultNoImageModel}
            onToggleFavorite={toggleFavorite}
          />
        ))}
      </List.Section>
    </List>
  );
}
