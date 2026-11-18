import { Action, ActionPanel, getPreferenceValues, Grid, Icon } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { getAllCharacters, getBanners, getGameVersion } from "./lib/utils/lunaris";
import { compareSemverStrings } from "./lib/utils/format";
import { useEffect, useMemo, useState } from "react";
import SingleCharacter from "./components/character/single-character";
import { API_ENDPOINT } from "./lib/constants";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { data: characters } = usePromise(getAllCharacters);
  const { isLoading, data: banners } = useCachedPromise(async (): Promise<BannerInformation[]> => {
    const gameVersion = await getGameVersion();
    const allBanners = await getBanners();
    if (!allBanners) return [];

    const bannerInformation: BannerInformation[] = Object.entries(allBanners.version)
      .filter(([version]) => {
        if (!preferences.allowUnreleased && gameVersion) {
          // compare semantic version strings rather than using parseFloat
          const cmp = compareSemverStrings(version, gameVersion);
          if (cmp === 1) {
            return false;
          }
        }
        return true;
      })
      .map(([version, characters]) => ({
        version,
        characters,
      }));

    return bannerInformation;
  });

  const [selectedVersion, setSelectedVersion] = useState(banners && banners[0] ? banners[0].version : null);

  if (!isLoading && (!banners || banners.length === 0)) {
    return (
      <Grid isLoading={false} columns={4} fit={Grid.Fit.Fill} aspectRatio="9/16">
        <Grid.EmptyView title="No banners" description="Could not load banners." />
      </Grid>
    );
  }

  useEffect(() => {
    if (banners && banners.length > 0 && !selectedVersion) {
      setSelectedVersion(banners[0].version);
    }
  }, [banners]);

  const activeBanner = useMemo(() => {
    if (!banners) return;
    return banners.find((b) => b.version === selectedVersion);
  }, [selectedVersion, banners]);

  return (
    <Grid
      isLoading={isLoading}
      columns={4}
      fit={Grid.Fit.Fill}
      aspectRatio="9/16"
      navigationTitle={`Banners / ${selectedVersion || "Loading..."}`}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Select version" onChange={(newValue) => setSelectedVersion(newValue)}>
          {banners &&
            banners.map(({ version }) => <Grid.Dropdown.Item key={version} title={version} value={version} />)}
        </Grid.Dropdown>
      }
    >
      {activeBanner &&
        characters &&
        selectedVersion &&
        activeBanner.characters.map((id) => <GridCharacterItem key={id} characters={characters} id={id} />)}
    </Grid>
  );
}

type GridCharacterItemProps = {
  characters: CharactersMap;
  id: number;
};

function GridCharacterItem({ characters, id }: GridCharacterItemProps) {
  const character = characters[id.toString()];
  if (!character) return null;

  return (
    <Grid.Item
      title={character.enName}
      content={{
        source: `${API_ENDPOINT}/assets/gachaicon/${character.GachaImg.replace("UI_Gacha_AvatarImg_", "UI_Gacha_AvatarIcon_")}.webp`,
      }}
      accessory={{
        icon: `elements/${character.element === "Unknown" ? "adaptive" : character.element.toLowerCase()}.png`,
        tooltip: character.element,
      }}
      actions={
        <ActionPanel>
          <Action.Push
            title="Detailed Information"
            icon={Icon.Person}
            target={<SingleCharacter id={id.toString()} character={character} />}
          />
        </ActionPanel>
      }
    />
  );
}
