import { useEffect, useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  Detail,
  LocalStorage,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";

interface Giveaway {
  id: number;
  title: string;
  worth: string;
  thumbnail: string;
  image: string;
  description: string;
  instructions: string;
  open_giveaway: string;
  published_date: string;
  type: string;
  platforms: string;
  end_date: string;
  users: number;
  status: string;
}

function parsePlatformsAndStores(platformsString: string) {
  const parts = platformsString.split(", ").map((p) => p.trim());

  const categories = {
    stores: [] as string[],
    pc: [] as string[],
    playstation: [] as string[],
    xbox: [] as string[],
    switch: [] as string[],
    mobile: [] as string[],
    vr: [] as string[],
  };

  parts.forEach((p) => {
    const lowerP = p.toLowerCase();

    if (
      lowerP.includes("steam") ||
      lowerP.includes("epic") ||
      lowerP.includes("gog")
    ) {
      categories.stores.push(p);
    } else if (lowerP === "pc" || lowerP === "windows") {
      categories.pc.push(p);
    } else if (
      lowerP.includes("playstation") ||
      lowerP.includes("ps3") ||
      lowerP.includes("ps4") ||
      lowerP.includes("ps5") ||
      lowerP.includes("vita")
    ) {
      categories.playstation.push(p);
    } else if (lowerP.includes("xbox")) {
      categories.xbox.push(p);
    } else if (lowerP.includes("switch") || lowerP.includes("nintendo")) {
      categories.switch.push(p);
    } else if (
      lowerP.includes("android") ||
      lowerP.includes("ios") ||
      lowerP.includes("mobile")
    ) {
      categories.mobile.push(p);
    } else if (lowerP.includes("vr")) {
      categories.vr.push(p);
    } else {
      categories.stores.push(p);
    }
  });

  const accessories: List.Item.Accessory[] = [];

  categories.stores.forEach((store) => {
    let tagColor = Color.SecondaryText;
    const lower = store.toLowerCase();
    if (lower.includes("steam")) tagColor = Color.Blue;
    else if (lower.includes("epic")) tagColor = Color.PrimaryText;
    else if (lower.includes("gog")) tagColor = Color.Purple;
    accessories.push({
      tag: { value: store, color: tagColor },
      tooltip: "Storefront",
    });
  });

  if (categories.pc.length > 0) {
    accessories.push({
      icon: { source: Icon.Monitor, tintColor: Color.SecondaryText },
      tooltip: categories.pc.join(", "),
    });
  }
  if (categories.playstation.length > 0) {
    accessories.push({
      icon: { source: Icon.GameController, tintColor: Color.Blue },
      tooltip: categories.playstation.join(", "),
    });
  }
  if (categories.xbox.length > 0) {
    accessories.push({
      icon: { source: Icon.GameController, tintColor: Color.Green },
      tooltip: categories.xbox.join(", "),
    });
  }
  if (categories.switch.length > 0) {
    accessories.push({
      icon: { source: Icon.GameController, tintColor: Color.Red },
      tooltip: categories.switch.join(", "),
    });
  }
  if (categories.mobile.length > 0) {
    accessories.push({
      icon: { source: Icon.Mobile, tintColor: Color.Yellow },
      tooltip: categories.mobile.join(", "),
    });
  }
  if (categories.vr.length > 0) {
    accessories.push({
      icon: { source: Icon.Eye, tintColor: Color.Orange },
      tooltip: categories.vr.join(", "),
    });
  }

  return accessories;
}

export default function FreeGames() {
  const preferences = getPreferenceValues<Preferences.FreeGames>();
  const { isLoading, data, error } = useFetch<Giveaway[]>(
    "https://www.gamerpower.com/api/giveaways",
  );

  const [ignoredIds, setIgnoredIds] = useState<number[]>([]);
  const [viewFilter, setViewFilter] = useState<string>("all");

  useEffect(() => {
    LocalStorage.getItem<string>("ignored_giveaways").then((storedIds) => {
      if (storedIds) setIgnoredIds(JSON.parse(storedIds));
    });
  }, []);

  useEffect(() => {
    if (!error) {
      return;
    }

    showFailureToast(error, {
      title: "Failed to load giveaways",
    });
  }, [error]);

  const toggleIgnore = async (id: number) => {
    let newIds;
    if (ignoredIds.includes(id)) {
      newIds = ignoredIds.filter((i) => i !== id);
    } else {
      newIds = [...ignoredIds, id];
    }
    setIgnoredIds(newIds);
    await LocalStorage.setItem("ignored_giveaways", JSON.stringify(newIds));
  };

  const filteredData = data?.filter((game) => {
    const isIgnored = ignoredIds.includes(game.id);
    const platforms = game.platforms.toLowerCase();
    const type = game.type.toLowerCase();

    if (!preferences.showDLCFreeGames && type.includes("dlc")) {
      return false;
    }

    if (viewFilter === "ignored") return isIgnored;
    if (isIgnored) return false;

    if (viewFilter === "all") return true;
    if (viewFilter === "pc")
      return platforms.includes("pc") || platforms.includes("windows");
    if (viewFilter === "ps")
      return (
        platforms.includes("playstation") ||
        platforms.includes("ps3") ||
        platforms.includes("ps4") ||
        platforms.includes("ps5")
      );
    if (viewFilter === "xbox") return platforms.includes("xbox");
    if (viewFilter === "switch")
      return platforms.includes("switch") || platforms.includes("nintendo");
    if (viewFilter === "mobile")
      return platforms.includes("android") || platforms.includes("ios");
    if (viewFilter === "vr") return platforms.includes("vr");

    return true;
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by title, storefront or platform (e.g. PlayStation)..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter View"
          value={viewFilter}
          onChange={(newValue) => setViewFilter(newValue)}
        >
          <List.Dropdown.Section title="General">
            <List.Dropdown.Item
              title="All Giveaways"
              value="all"
              icon={Icon.Gift}
            />
            <List.Dropdown.Item
              title="Ignored Games"
              value="ignored"
              icon={Icon.EyeDisabled}
            />
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Platforms">
            <List.Dropdown.Item
              title="PC / Windows"
              value="pc"
              icon={Icon.Monitor}
            />
            <List.Dropdown.Item
              title="PlayStation"
              value="ps"
              icon={Icon.GameController}
            />
            <List.Dropdown.Item
              title="Xbox"
              value="xbox"
              icon={Icon.GameController}
            />
            <List.Dropdown.Item
              title="Nintendo Switch"
              value="switch"
              icon={Icon.GameController}
            />
            <List.Dropdown.Item
              title="Mobile"
              value="mobile"
              icon={Icon.Mobile}
            />
            <List.Dropdown.Item title="VR" value="vr" icon={Icon.Eye} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredData?.length === 0 && !isLoading && (
        <List.EmptyView
          title={
            viewFilter === "ignored"
              ? "No ignored games"
              : "No giveaways found for this filter"
          }
          icon={
            viewFilter === "ignored" ? Icon.EyeDisabled : Icon.MagnifyingGlass
          }
        />
      )}

      {filteredData?.map((game) => {
        const platformAccessories = parsePlatformsAndStores(game.platforms);
        const isIgnored = ignoredIds.includes(game.id);
        const searchKeywords = game.platforms.split(", ");

        return (
          <List.Item
            key={game.id}
            title={game.title}
            keywords={searchKeywords}
            icon={{ source: game.thumbnail, fallback: Icon.GameController }}
            subtitle={game.type}
            accessories={platformAccessories}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="View Details & Instructions"
                    target={
                      <GiveawayDetail
                        game={game}
                        toggleIgnore={() => toggleIgnore(game.id)}
                        isIgnored={isIgnored}
                      />
                    }
                    icon={Icon.Sidebar}
                  />
                  <Action.OpenInBrowser
                    title="Get Giveaway"
                    url={game.open_giveaway}
                    icon={Icon.Globe}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title={isIgnored ? "Restore Game" : "Ignore Game"}
                    onAction={() => toggleIgnore(game.id)}
                    icon={isIgnored ? Icon.Eye : Icon.EyeDisabled}
                    shortcut={{
                      Windows: { modifiers: ["ctrl"], key: "i" },
                      macOS: { modifiers: ["cmd"], key: "i" },
                    }}
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

function GiveawayDetail({
  game,
  toggleIgnore,
  isIgnored,
}: {
  game: Giveaway;
  toggleIgnore: () => void;
  isIgnored: boolean;
}) {
  const endDate =
    game.end_date !== "N/A"
      ? new Date(game.end_date).toLocaleDateString("en-GB")
      : "No end date";

  const markdown = `
![](${game.image})

# ${game.title}

${game.description}

---

### How to claim:
${game.instructions}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={game.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={game.type} />

          <Detail.Metadata.TagList title="Playable On / Stores">
            {game.platforms.split(", ").map((p, index) => {
              const isStore =
                p.toLowerCase().includes("steam") ||
                p.toLowerCase().includes("epic") ||
                p.toLowerCase().includes("gog");
              return (
                <Detail.Metadata.TagList.Item
                  key={index}
                  text={p}
                  color={isStore ? Color.Blue : Color.SecondaryText}
                />
              );
            })}
          </Detail.Metadata.TagList>

          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Regular Price"
            text={game.worth === "N/A" ? "Always Free" : game.worth}
          />
          <Detail.Metadata.Label
            title="Status"
            text={game.status}
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          />
          <Detail.Metadata.Label title="End Date" text={endDate} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Claimed By"
            text={`${game.users.toLocaleString()} users`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Get Giveaway"
            url={game.open_giveaway}
            icon={Icon.Download}
          />
          <Action
            title={isIgnored ? "Restore Game" : "Ignore Game"}
            onAction={toggleIgnore}
            icon={isIgnored ? Icon.Eye : Icon.EyeDisabled}
            shortcut={{
              Windows: { modifiers: ["ctrl"], key: "i" },
              macOS: { modifiers: ["cmd"], key: "i" },
            }}
          />
        </ActionPanel>
      }
    />
  );
}
