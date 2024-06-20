import { Action, ActionPanel, List, Keyboard, Cache, showToast, Toast, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getData, typeColor, iconStar } from "./utils";
import { Alias } from "./types";
import CommandDetail from "./command-detail";

const cache = new Cache();

export default function Command() {
  const { isLoading, data, revalidate } = useCachedPromise(async () => {
    const response = JSON.parse(cache.get("data") || "{}");
    const { aliases = getData() } = response;
    return { aliases };
  });

  const aliases: Alias[] = data?.aliases || [];
  const favorites: Alias[] = aliases?.filter((alias: Alias) => alias.fav) || [];
  const recent: Alias[] = aliases?.filter((alias: Alias) => alias.recent) || [];
  const hasRecent = recent?.length > 0 || false;

  const saveCache = async ({ data, title, message }: { data: Alias[] | []; title?: string; message?: string }) => {
    if (!data || !data.length || data.some((a) => typeof a !== "object")) {
      await showToast({
        title: "Error saving",
        message: "Invalid data provided to saveCache",
        style: Toast.Style.Failure,
      });
      return;
    }

    cache.set("data", JSON.stringify({ aliases: data }));
    if (title && message) await showToast({ title, message });
    revalidate();
  };

  const handleFav = (alias: Alias) => {
    const data = aliases?.map((a) => {
      return a.name === alias.name ? { ...a, fav: !a.fav, recent: !a.fav ? false : a.recent } : a;
    });

    const options = alias.fav
      ? {
          title: "Favorite removed",
          message: alias.name + " has been removed from favorites",
        }
      : {
          title: "Favorite added",
          message: alias.name + " has been added to favorites",
        };

    saveCache({ data, ...options });
  };

  const addRecent = (alias: Alias) => {
    const data = aliases?.map((a) => {
      // Set as recent only if alias is not a favorite
      const recent = a.fav ? a.recent : true;
      return a.name === alias.name ? { ...a, recent } : a;
    });

    saveCache({ data });
  };

  const removeRecent = (alias: Alias) => {
    const data = aliases?.map((a) => {
      return a.name === alias.name ? { ...a, recent: false } : a;
    });

    saveCache({ data, title: "Recent removed", message: alias.name + " has been removed from recent" });
  };

  const clearRecent = () => {
    const data = aliases?.map((alias) => ({ ...alias, recent: false }));
    saveCache({ data, title: "All recent removed" });
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
        {hasRecent && (
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
        {favorites.map((alias) => (
          <Item key={alias.name} alias={alias} />
        ))}
      </List.Section>

      <List.Section title="Recently Used">
        {recent.map((alias) => (
          <Item key={alias.name} alias={alias} />
        ))}
      </List.Section>

      <List.Section title="Commands">
        {aliases.map((alias) => (
          <Item key={alias.name} alias={alias} />
        ))}
      </List.Section>
    </List>
  );
}
