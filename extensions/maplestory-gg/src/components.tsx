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
  onRefreshCharacter,
}: {
  checkLatest?: boolean;
  characterData: CharacterData;
  onRemoveCharacter?: () => void;
  onRefreshCharacter?: () => void | Promise<void>;
}) => {
  const [character, setCharacter] = useState<CharacterData>(characterData);

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
        await saveCharacterToFavorites(characterData, true);
        setCharacter(characterData);
        await onRefreshCharacter?.();
        await toast.hide();
      } catch {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not refresh character";
        toast.message = "Showing saved data.";
      }
    };
    loadLatestCharacterData();
  }, [character.Region, character.Name, checkLatest, onRefreshCharacter]);

  const escapeMarkdown = (value: string) => value.replace(/([\\`*_{}[\]()<>#+.!|~-])/g, "\\$1");
  const ranks = [
    ["Region", character.GlobalRanking],
    ["Server", character.ServerRank],
    ["Class", character.ClassRank],
  ] as const;
  const rankingLines = ranks
    .filter(([, rank]) => rank !== undefined)
    .map(([label, rank]) => `**${label}**  #${rank!.toLocaleString()}`);
  const markdown = [
    `![](${character.CharacterImageURL})`,
    `# ${escapeMarkdown(character.Name)}`,
    `**Lv. ${character.Level}** · ${escapeMarkdown(character.Class)} · ${escapeMarkdown(character.Server)}`,
    ...(rankingLines.length ? ["---", "## Rankings", rankingLines.join("  \n")] : []),
  ].join("\n\n");

  return (
    <Detail
      navigationTitle={character.Name}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Region" text={character.Region === "ems" ? "Europe" : "North America"} />
          <Detail.Metadata.Label title="Current EXP" text={character.EXP.toLocaleString()} />
          {character.LegionLevel !== undefined && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Legion Level" text={character.LegionLevel.toLocaleString()} />
              <Detail.Metadata.Label title="Legion Power" text={character.LegionPower?.toLocaleString()} />
              {character.LegionRank !== undefined && (
                <Detail.Metadata.Label title="Server Legion Rank" text={character.LegionRank.toLocaleString()} />
              )}
            </>
          )}
          {character.LegionUnavailable && <Detail.Metadata.Label title="Legion" text="Unavailable" />}
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
