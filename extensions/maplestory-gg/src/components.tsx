import { useCallback, useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Icon,
  LaunchType,
  Toast,
  confirmAlert,
  environment,
  launchCommand,
  showToast,
} from "@raycast/api";
import {
  generateDailyExpDifferenceChart,
  generateTotalExpChart,
  hasCharacterInFavorites,
  lookupCharacter,
  removeCharacterFromFavorites,
  saveCharacterToFavorites,
} from "./utils.js";
import { CharacterData } from "./types.js";

export const RemoveFromFavoritesAction = ({
  characterData,
  onRemoveCharacter,
}: {
  characterData: CharacterData;
  onRemoveCharacter?: () => void;
}) => (
  <Action
    icon={Icon.RemovePerson}
    title="Remove from Favorites"
    style={Action.Style.Destructive}
    onAction={async () => {
      const confirmed = await confirmAlert({
        title: "Remove Character",
        icon: Icon.RemovePerson,
        rememberUserChoice: true,
        message: `Are you sure you want to remove ${characterData.Name} from your favorites?`,
        primaryAction: {
          title: "Confirm",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;
      await removeCharacterFromFavorites(characterData);
      onRemoveCharacter?.();
    }}
  />
);

export const SaveCharacterToFavorites = ({
  characterData,
  onRemoveCharacter,
}: {
  characterData: CharacterData;
  onRemoveCharacter?: () => void;
}) => {
  const [hasCharacter, setHasCharacter] = useState(false);

  const load = useCallback(async () => {
    const hasCharacter = await hasCharacterInFavorites(characterData);
    setHasCharacter(hasCharacter);
  }, [characterData]);

  useEffect(() => {
    load();
  }, [load]);

  return hasCharacter ? (
    <>
      {environment.commandName === "lookup" && (
        <Action
          icon={Icon.Star}
          title="View in Favorites"
          onAction={() => {
            launchCommand({ name: "favorites", type: LaunchType.UserInitiated });
          }}
        />
      )}
      <RemoveFromFavoritesAction
        characterData={characterData}
        onRemoveCharacter={() => {
          load();
          onRemoveCharacter?.();
        }}
      />
    </>
  ) : (
    <Action
      icon={Icon.AddPerson}
      title="Save to Favorites"
      onAction={async () => {
        await saveCharacterToFavorites(characterData, true);
        await load();
      }}
    />
  );
};

export const CharacterDetail = ({
  checkLatest,
  characterData,
  onRemoveCharacter,
}: {
  checkLatest?: boolean;
  characterData: CharacterData;
  onRemoveCharacter?: () => void;
}) => {
  const [character, setCharacter] = useState<CharacterData>(characterData);
  const [dailyExpChart, setDailyExpChart] = useState<string>();
  const [totalExpChart, setTotalExpChart] = useState<string>();

  const loadCharts = async (characterData: CharacterData) => {
    const [dailyExpChart, totalExpChart] = await Promise.all([
      generateDailyExpDifferenceChart(characterData.GraphData).catch(() => ""),
      generateTotalExpChart(characterData.GraphData).catch(() => ""),
    ]).then(async (charts) => {
      return charts;
    });
    setDailyExpChart(dailyExpChart);
    setTotalExpChart(totalExpChart);
  };

  useEffect(() => {
    const loadLatestCharacterData = async () => {
      if (!checkLatest) return;
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "",
        message: "Loading latest character data...",
      });
      try {
        const characterData = await lookupCharacter(character.Region, character.Name);
        setCharacter(characterData);
        saveCharacterToFavorites(characterData);
      } catch {
        // Handle error gracefully
      } finally {
        toast.hide();
      }
    };
    loadLatestCharacterData();
  }, [character.Region, character.Name, checkLatest]);

  useEffect(() => {
    loadCharts(character);
  }, [character]);

  const markdownContent = character
    ? [
        `![](${character.CharacterImageURL})`,
        dailyExpChart ? `![](${dailyExpChart})` : "",
        " ".repeat(2),
        totalExpChart ? `![](${totalExpChart})` : "",
      ]
        .filter(Boolean)
        .join("")
    : "";

  if (!character) return <Detail />;

  return (
    <Detail
      markdown={markdownContent}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={character.Name} />
          <Detail.Metadata.Label title="Server" text={`${character.Server} (#${character.ServerRank})`} />
          <Detail.Metadata.Label title="Level" text={`${character.Level} - ${character.EXPPercent}%`} />
          <Detail.Metadata.Label title="Class" text={`${character.Class} (#${character.ClassRank})`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Legion Rank" text={`${character.LegionRank}`} />
          <Detail.Metadata.Label title="Legion Level" text={`${character.LegionLevel}`} />
          <Detail.Metadata.Label title="Legion Power" text={`${character.LegionPower}`} />
          <Detail.Metadata.Label title="Legion Coins Per Day" text={`${character.LegionCoinsPerDay}`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <SaveCharacterToFavorites characterData={character} onRemoveCharacter={onRemoveCharacter} />
        </ActionPanel>
      }
    />
  );
};
