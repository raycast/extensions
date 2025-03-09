import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useDiscord, type DiscordMethods } from "./useDiscord";
import { groupBy } from "./utils";
import { useCachedState } from "@raycast/utils";
import { useFavorites, FavoritesActionSection, type FavoriteMethods } from "./useFavorites";
import type { SoundboardItem } from "./discord";

export default function Command() {
  const [columns, setColumns] = useCachedState("open-soundboard-columns", 8);
  const { soundboardItems, isLoading, ...discordMethods } = useDiscord();
  const { favorites, ...favoriteMethods } = useFavorites();

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(newValue) => {
            setColumns(parseInt(newValue));
          }}
        >
          <Grid.Dropdown.Item title="Large" value={"4"} />
          <Grid.Dropdown.Item title="Medium" value={"6"} />
          <Grid.Dropdown.Item title="Small" value={"8"} />
        </Grid.Dropdown>
      }
    >
      {(!isLoading || soundboardItems.length > 0) && (
        <>
          <Grid.Section title="FAVORITES">
            {soundboardItems
              .filter((item) => favorites.includes(item.id))
              .toSorted((a, b) => favorites.indexOf(a.id) - favorites.indexOf(b.id))
              .map((item) => (
                <SoundGirdItem
                  key={item.id}
                  item={item}
                  isFavorite={true}
                  guildName="Favorites"
                  {...discordMethods}
                  {...favoriteMethods}
                />
              ))}
          </Grid.Section>

          {Object.entries(groupBy(soundboardItems, "guildName")).map(([guildName, items]) => (
            <Grid.Section key={guildName} title={guildName.toUpperCase()}>
              {items.map((item) => (
                <SoundGirdItem
                  key={item.id}
                  item={item}
                  guildName={guildName}
                  {...discordMethods}
                  {...favoriteMethods}
                />
              ))}
            </Grid.Section>
          ))}
        </>
      )}
    </Grid>
  );
}

function SoundGirdItem(
  props: { item: SoundboardItem; guildName: string; isFavorite?: boolean } & DiscordMethods & FavoriteMethods,
) {
  const { item, guildName, playSound, playSoundInCurrentChannel, refetch } = props;
  return (
    <Grid.Item
      key={item.id}
      accessory={
        !item.available
          ? {
              icon: Icon.Lock,
            }
          : undefined
      }
      content={{
        value: {
          source: item.emojiName
            ? item.emojiName
            : item.emojiId
              ? `https://cdn.discordapp.com/emojis/${item.emojiId}.webp?size=96`
              : "",
        },
        tooltip: item.name,
      }}
      title={item.name}
      keywords={[item.name, item.id, guildName]}
      actions={
        <ActionPanel>
          {item.available && (
            <>
              {/* <Action
                title="Play in Current Channel and Close"
                icon={Icon.Play}
                onAction={() => playSoundInCurrentChannel(item, true)}
              /> */}
              <Action
                title="Play in Current Channel"
                icon={Icon.Play}
                onAction={() => playSoundInCurrentChannel(item)}
              />
            </>
          )}
          <Action
            title="Play"
            icon={Icon.SpeakerOn}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={() => playSound(item)}
          />
          <FavoritesActionSection {...props} />
          <ActionPanel.Section>
            <Action title="Sync Sounds" icon={Icon.RotateAntiClockwise} onAction={() => refetch()}></Action>
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
