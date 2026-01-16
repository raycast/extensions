import { Icon, List, showToast, Toast, Color, ActionPanel } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { ZeroEvalAPI } from "./utils/zeroeval-api";
import { ArenaModel } from "./types";
import { getOrganizationLogo } from "./utils/organization-logos";
import { useModels } from "./utils/use-models";
import {
  ShowDetailsAction,
  ModelDetailsLinkAction,
  OpenPlaygroundAction,
  CompareWithSubmenu,
} from "./components/actions/ModelActions";
import { ARENAS_BY_SECTION } from "./utils/arenas";

const api = new ZeroEvalAPI();

export default function Command() {
  const [selectedArena, setSelectedArena] = useCachedState<string>(
    "selected-arena",
    ARENAS_BY_SECTION.get("Chat Arena")?.[0].id || "",
  );

  // Load and cache all models
  const { data: allModels, isLoading: isLoadingModels } = useModels(true, true);

  const {
    data: leaderboardData,
    isLoading: isLoadingLeaderboard,
    error,
    revalidate,
  } = useCachedPromise(
    async (arenaId: string) => {
      return api.getArenaLeaderboard(arenaId, 50, 0);
    },
    [selectedArena],
    {
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load leaderboard",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      },
    },
  );

  const handleArenaChange = (newArenaId: string) => {
    setSelectedArena(newArenaId);
    revalidate();
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error loading leaderboard"
          description={error instanceof Error ? error.message : "Unknown error occurred"}
        />
      </List>
    );
  }

  const models = leaderboardData?.leaderboard || [];
  const isLoading = isLoadingLeaderboard || isLoadingModels;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search models..."
      searchBarAccessory={
        <List.Dropdown tooltip="Select Arena" value={selectedArena} onChange={handleArenaChange}>
          {Array.from(ARENAS_BY_SECTION.entries()).map(([sectionName, section]) => (
            <List.Dropdown.Section key={sectionName} title={sectionName}>
              {section.map((arena) => (
                <List.Dropdown.Item key={arena.id} title={arena.name} value={arena.id} icon={arena.icon} />
              ))}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
    >
      {models.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No models found"
          description="Try selecting a different arena"
        />
      ) : (
        models.map((model: ArenaModel, index) => {
          const cachedModel = allModels?.find((m) => m.model_id === model.model_id);
          return (
            <List.Item
              key={model.variant_id}
              icon={getOrganizationLogo(cachedModel?.organization_id || model.organization.toLowerCase())}
              title={cachedModel?.name || model.model_name}
              subtitle={cachedModel?.organization || model.organization}
              keywords={[cachedModel?.organization || model.organization]}
              accessories={[
                {
                  text: `${model.wins}`,
                  icon: Icon.ThumbsUp,
                  tooltip: "Votes",
                },
                createScoreAccessory(model, index),
              ]}
              actions={
                <ActionPanel>
                  <ShowDetailsAction modelId={model.model_id} />
                  <ModelDetailsLinkAction modelId={model.model_id} />
                  <OpenPlaygroundAction modelId={model.model_id} />
                  <CompareWithSubmenu modelId={model.model_id} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

/**
 * Creates an accessory for score or percent gain display
 * @param model - The arena model
 * @param index - The model's position in the leaderboard
 * @returns List.Item.Accessory for the score/percent gain
 */
function createScoreAccessory(model: ArenaModel, index: number): List.Item.Accessory {
  const trophyColors = [Color.Yellow, Color.PrimaryText, Color.Orange];

  if (index < 3) {
    return {
      tag: {
        value:
          model.percent_gain !== undefined
            ? `${model.percent_gain! >= 0 ? "+" : ""}${model.percent_gain!.toFixed(2)}%`
            : `${model.conservative_rating?.toFixed(2) || "-"}`,
        color: trophyColors[index],
      },
      icon: Icon.Trophy,
      tooltip: model.percent_gain !== undefined ? "Percent Gain" : "Score",
    };
  }

  if (model.percent_gain !== undefined) {
    return {
      text: {
        value: `${model.percent_gain! >= 0 ? "+" : ""}${model.percent_gain!.toFixed(2)}%`,
        color: model.percent_gain! >= 0 ? Color.Green : Color.Red,
      },
      tooltip: "Percent Gain",
    };
  }

  return {
    tag: {
      value: `${model.conservative_rating?.toFixed(2) || "-"}`,
      color: Color.SecondaryText,
    },
    tooltip: "Score",
  };
}
