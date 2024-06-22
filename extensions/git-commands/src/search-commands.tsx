import { Action, ActionPanel, List, Keyboard, Cache, showToast, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getAliases, typeColor, iconStar, maxRecent, maxFavs } from "./utils";
import { Alias } from "./types";
import CommandDetail from "./command-detail";

const cache = new Cache();

export default function Command() {
  interface Data {
    aliases: Alias[];
    favorites: Alias[];
    recent: Alias[];
  }

  const fetchData = async (): Promise<Data> => {
    const response = JSON.parse(cache.get("data") || "{}");
    const { aliases = getAliases() } = response;
    const reversed: Alias[] = aliases.slice().reverse();
    const favorites = reversed.filter((alias) => alias.fav).slice(0, maxFavs);
    const recent = reversed.filter((alias) => alias.recent).slice(0, maxRecent);

    return { aliases, favorites, recent };
  };

  const { isLoading, data, revalidate } = useCachedPromise(fetchData, [], {
    initialData: { aliases: [], favorites: [], recent: [] },
  });

  const saveAliases = async ({ aliases }: { aliases: Alias[] }) => {
    if (!aliases?.length) return;

    cache.set("data", JSON.stringify({ aliases }));
    revalidate();
  };

  const handleFav = (alias: Alias) => {
    const aliases = data.aliases.map((a: Alias) => {
      return a.name === alias.name ? { ...a, fav: !a.fav, recent: !a.fav ? false : a.recent } : a;
    });

    saveAliases({ aliases }).then(() => {
      showToast(
        alias.fav
          ? { title: "Favorite removed", message: alias.name + " has been removed from favorites" }
          : { title: "Favorite added", message: alias.name + " has been added to favorites" },
      );
    });
  };

  const addRecent = (alias: Alias) => {
    const aliases = data.aliases.map((a: Alias) => {
      // Set as recent only if alias is not a favorite
      const recent = a.fav ? a.recent : true;
      return a.name === alias.name ? { ...a, recent } : a;
    });

    saveAliases({ aliases });
  };

  const removeRecent = (alias: Alias) => {
    const aliases = data.aliases.map((a) => {
      return a.name === alias.name ? { ...a, recent: false } : a;
    });

    saveAliases({ aliases }).then(() =>
      showToast({ title: "Recent removed", message: alias.name + " has been removed from recent" }),
    );
  };

  const clearRecent = () => {
    const aliases = data.aliases.map((alias) => ({ ...alias, recent: false }));
    saveAliases({ aliases }).then(() =>
      showToast({ title: "All recent removed", message: "All recent commands have been removed" }),
    );
  };

  const Item = ({ alias }: { alias: Alias }) => {
    const { name, command, type, description, fav = false } = alias;
    const tag = { tag: { value: name, color: typeColor(type) } };
    return (
      <List.Item
        title={command}
        subtitle={description}
        keywords={[description, command]}
        accessories={[...(fav ? [{ icon: iconStar() }] : []), tag]}
        actions={Actions(alias)}
      />
    );
  };

  const Actions = (alias: Alias) => {
    return (
      <ActionPanel>
        <Action.Push
          icon={Icon.Eye}
          title="Open Alias"
          target={<CommandDetail alias={alias} onFavorite={() => handleFav(alias)} onCopy={() => addRecent(alias)} />}
          shortcut={Keyboard.Shortcut.Common.Open}
        />

        <Action.CopyToClipboard
          title="Copy Alias"
          content={alias.name}
          shortcut={Keyboard.Shortcut.Common.Copy}
          onCopy={() => addRecent(alias)}
        />

        <>
          {alias.fav && (
            <Action
              icon={Icon.StarDisabled}
              title="Remove From Favorites"
              onAction={() => handleFav(alias)}
              shortcut={Keyboard.Shortcut.Common.Remove}
            />
          )}
          {alias.fav || (
            <Action
              icon={Icon.Star}
              title="Add to Favorites"
              onAction={() => handleFav(alias)}
              shortcut={Keyboard.Shortcut.Common.Pin}
            />
          )}
        </>

        {alias.recent && (
          <Action
            icon={Icon.Clock}
            title="Remove From Recent"
            onAction={() => removeRecent(alias)}
            shortcut={Keyboard.Shortcut.Common.Remove}
          />
        )}
        {data.recent.length && (
          <Action
            icon={Icon.XMarkCircle}
            title="Clear All Recent"
            onAction={clearRecent}
            shortcut={Keyboard.Shortcut.Common.RemoveAll}
          />
        )}
      </ActionPanel>
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search command, description or alias">
      <List.Section title="Favorites">
        {data.favorites.map((alias) => (
          <Item key={alias.name} alias={alias} />
        ))}
      </List.Section>

      <List.Section title="Recently Used">
        {data.recent.map((alias) => (
          <Item key={alias.name} alias={alias} />
        ))}
      </List.Section>

      <List.Section title="Commands">
        {data.aliases.map((alias) => (
          <Item key={alias.name} alias={alias} />
        ))}
      </List.Section>
    </List>
  );
}
