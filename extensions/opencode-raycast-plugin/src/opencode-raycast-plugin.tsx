import { useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { foldCatalog, type CatalogView } from "./lib/catalog";
import {
  PICK_COLOR,
  PICK_ICON,
  pickLabel,
  progressIcon,
  windowRows,
} from "./lib/display";
import { modalityText, moneyPerMillion } from "./lib/format";
import { isKeyProblem } from "./lib/types";
import type { Failure, Model } from "./lib/types";
import {
  collectUsage,
  maxModelsFromPreferences,
  readInitialPayload,
} from "./lib/usage";

function ErrorView({
  failure,
  onRefresh,
}: {
  failure: Failure;
  onRefresh: () => void;
}) {
  const keyProblem = isKeyProblem(failure.type);
  const description: Record<Failure["type"], string | undefined> = {
    "no-key": "Paste your OpenCode Go API key in Extension Preferences.",
    "bad-key": "Paste a new API key in Extension Preferences.",
    "no-entitlement": "An OpenCode Go subscription is required.",
    offline: undefined,
    service: "The OpenCode Go API returned an error. Try again later.",
  };
  return (
    <List>
      <List.EmptyView
        icon={Icon.Warning}
        title={failure.message}
        description={description[failure.type]}
        actions={
          <ActionPanel>
            {keyProblem && (
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={() => openExtensionPreferences()}
              />
            )}
            <Action
              title="Force Refresh"
              icon={Icon.RotateClockwise}
              onAction={onRefresh}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function ModelRow({
  model,
  shared,
  onRefresh,
}: {
  model: Model;
  shared: boolean;
  onRefresh: () => void;
}) {
  const cost = model.cost;
  return (
    <List.Item
      key={model.id}
      icon={model.isPick ? PICK_ICON[model.isPick] : Icon.Bolt}
      title={model.id}
      subtitle={modalityText(model.modalities)}
      accessories={[
        ...(shared
          ? [{ tag: { value: "also in Go", color: Color.Orange } }]
          : []),
        ...(cost
          ? [
              {
                text: `${moneyPerMillion(cost.input)}/${moneyPerMillion(cost.output)}`,
              },
            ]
          : [{ text: "—" }]),
        ...(model.quota != null ? [{ text: `~${model.quota} req/5h` }] : []),
        ...(model.cost !== null &&
        model.cost.input === 0 &&
        model.cost.output === 0
          ? [{ tag: { value: "free", color: Color.Orange } }]
          : []),
        ...(model.isPick
          ? [
              {
                tag: {
                  value: pickLabel(model.isPick),
                  color: PICK_COLOR[model.isPick],
                },
              },
            ]
          : []),
      ]}
      actions={
        <ActionPanel>
          {cost && (
            <Action
              title="Copy Price"
              icon={Icon.Clipboard}
              onAction={() =>
                Clipboard.copy(
                  `${model.id}: ${moneyPerMillion(cost.input)} in / ${moneyPerMillion(cost.output)} out`,
                )
              }
            />
          )}
          <Action
            title="Open in Browser"
            icon={Icon.Globe}
            onAction={() => open("https://opencode.ai")}
          />
          <Action
            title="Force Refresh"
            icon={Icon.RotateClockwise}
            onAction={onRefresh}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={() => openExtensionPreferences()}
          />
        </ActionPanel>
      }
    />
  );
}

function FoldRow({
  view,
  onRefresh,
}: {
  view: CatalogView;
  onRefresh: () => void;
}) {
  if (view.folded <= 0) return null;
  return (
    <List.Item
      icon={Icon.Ellipsis}
      title={`and ${view.folded} more models (folded)`}
      subtitle="Type to search all models"
      actions={
        <ActionPanel>
          <Action
            title="Force Refresh"
            icon={Icon.RotateClockwise}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, mutate } = useCachedPromise(
    () => collectUsage(false),
    [],
    {
      initialData: readInitialPayload(),
      keepPreviousData: true,
    },
  );

  const refresh = () =>
    mutate(collectUsage(true), { shouldRevalidateAfter: false });

  if (!data) {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Loading Opencode Info…"
      />
    );
  }

  if (!data.ok) {
    return <ErrorView failure={data.failure} onRefresh={refresh} />;
  }

  const { payload } = data;
  const maxModels = maxModelsFromPreferences();
  const views = foldCatalog(payload.models, maxModels, searchText);
  const goIds = new Set(payload.models.go.map((m) => m.id));
  const rows = windowRows(payload.windows, new Date());

  return (
    <List
      isLoading={isLoading}
      filtering={true}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search models, limits, picks…"
      navigationTitle="Opencode Info"
    >
      {payload.offline && (
        <List.Item
          icon={Icon.Cloud}
          title="Offline · showing last-known data"
        />
      )}
      <List.Section title="Go limits">
        {rows.map((r) => (
          <List.Item
            key={r.key}
            icon={progressIcon(r.pct)}
            title={r.title}
            subtitle={r.subtitle}
          />
        ))}
      </List.Section>

      <List.Section title="Go models">
        {views.go.models.map((m) => (
          <ModelRow key={m.id} model={m} shared={false} onRefresh={refresh} />
        ))}
        <FoldRow view={views.go} onRefresh={refresh} />
      </List.Section>

      <List.Section title="Zen models">
        {views.zen.models.map((m) => (
          <ModelRow
            key={m.id}
            model={m}
            shared={goIds.has(m.id)}
            onRefresh={refresh}
          />
        ))}
        <FoldRow view={views.zen} onRefresh={refresh} />
      </List.Section>
    </List>
  );
}
