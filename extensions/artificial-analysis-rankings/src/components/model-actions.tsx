import { Action, ActionPanel, Icon, Keyboard, openExtensionPreferences } from "@raycast/api";
import { hasActiveFilters, type BrowseControls, type RankingsData } from "../hooks/use-rankings";
import { LEADERBOARD_URL } from "../lib/api";
import { ALL_PROVIDERS } from "../lib/filters";
import { modelSummary, modelUrl } from "../lib/format";
import { providerIcon } from "../lib/images";
import { METRICS } from "../lib/metrics";
import type { RankedModel } from "../lib/models";
import { CompareModels } from "./compare-models";
import { LeaderboardsSubmenu } from "./leaderboards";
import { ModelDetails } from "./model-details";

interface ModelActionsProps {
  data: RankingsData;
  model?: RankedModel;
  controls?: BrowseControls;
  /** Offer a push to the full details view. Off inside the details view itself. */
  showDetails?: boolean;
  /** The list's stats side panel, when the view has one. */
  panel?: { visible: boolean; toggle: () => void };
}

export function ModelActions({ data, model, controls, showDetails = true, panel }: ModelActionsProps) {
  const filters = controls && data.snapshot ? <FilterSection controls={controls} /> : null;
  // Empty views lead with Clear Filters when filters hide every result, and with Refresh otherwise.
  const filtersFirst = model !== undefined || (controls !== undefined && hasActiveFilters(controls));
  return (
    <ActionPanel title={model?.name}>
      {model ? (
        <>
          <ActionPanel.Section>
            {showDetails ? (
              <Action.Push
                title="View Model Details"
                icon={Icon.Sidebar}
                target={<ModelDetails modelId={model.id} metric={model.metric} />}
              />
            ) : null}
            <Action.OpenInBrowser title="Open on Artificial Analysis" url={modelUrl(model.slug)} />
            <FavoriteAction data={data} model={model} />
            <Action
              title={data.comparison.ids.has(model.id) ? "Remove from Comparison" : "Add to Comparison"}
              icon={data.comparison.ids.has(model.id) ? Icon.MinusCircle : Icon.PlusCircle}
              onAction={() => data.comparison.toggle(model.id)}
            />
            {data.comparison.ids.size ? (
              <Action.Push
                title={`Open Comparison (${data.comparison.ids.size})`}
                icon={Icon.BarChart}
                target={<CompareModels />}
              />
            ) : null}
            {panel ? (
              <Action
                title={panel.visible ? "Hide Details Panel" : "Show Details Panel"}
                icon={Icon.AppWindowSidebarRight}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={panel.toggle}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Summary"
              content={data.snapshot ? modelSummary(model, data.snapshot, data.preferences) : model.name}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard title="Copy Model Name" content={model.name} />
            <Action.CopyToClipboard title={`Copy ${METRICS[model.metric].title}`} content={String(model.value)} />
            <Action.CopyToClipboard title="Copy Model Link" content={modelUrl(model.slug)} />
          </ActionPanel.Section>
        </>
      ) : null}
      {filtersFirst ? filters : null}
      <GeneralActions data={data} />
      {filtersFirst ? null : filters}
    </ActionPanel>
  );
}

/** Refresh, navigation, and settings actions shared by every view. */
export function GeneralActions({ data }: { data: RankingsData }) {
  return (
    <ActionPanel.Section>
      <Action
        title="Refresh Rankings"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => data.refresh()}
      />
      <LeaderboardsSubmenu />
      <Action.OpenInBrowser title="Open Intelligence Index Leaderboard" url={LEADERBOARD_URL} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel.Section>
  );
}

function FavoriteAction({ data, model }: { data: RankingsData; model: RankedModel }) {
  const favorite = data.favorites.ids.has(model.id);
  return (
    <Action
      title={favorite ? "Remove from Favorites" : "Add to Favorites"}
      icon={favorite ? Icon.StarDisabled : Icon.Star}
      shortcut={Keyboard.Shortcut.Common.Pin}
      onAction={() => data.favorites.toggle(model.id)}
    />
  );
}

function FilterSection({ controls }: { controls: BrowseControls }) {
  return (
    <ActionPanel.Section>
      {hasActiveFilters(controls) ? (
        <Action
          title="Clear Filters"
          icon={Icon.XMarkCircle}
          onAction={() => {
            controls.setProviderId(ALL_PROVIDERS);
            controls.setFavoritesOnly(false);
          }}
        />
      ) : null}
      <Action
        title={controls.favoritesOnly ? "Show All Models" : "Show Favorites Only"}
        icon={controls.favoritesOnly ? Icon.StarDisabled : Icon.Star}
        onAction={() => controls.setFavoritesOnly(!controls.favoritesOnly)}
      />
      <ActionPanel.Submenu title="Filter by Provider" icon={Icon.Filter}>
        <Action
          title="All Providers"
          icon={controls.providerId === ALL_PROVIDERS ? Icon.Checkmark : Icon.Circle}
          onAction={() => controls.setProviderId(ALL_PROVIDERS)}
        />
        {controls.creators.map((creator) => (
          <Action
            key={creator.id}
            title={creator.name}
            icon={controls.providerId === creator.id ? Icon.Checkmark : providerIcon(creator.name)}
            onAction={() => controls.setProviderId(creator.id)}
          />
        ))}
      </ActionPanel.Submenu>
    </ActionPanel.Section>
  );
}
