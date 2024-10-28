import { Form, ActionPanel, Action, Cache, showToast, launchCommand, LaunchType } from "@raycast/api";
import { REALMS } from "./constants";
import { useState } from "react";

const cache = new Cache();

export default function Command() {
  const [name, setName] = useState("");
  const [realm, setRealm] = useState("");

  function addToFavorites() {
    const cachedFavorites = cache.get("favorites");
    const favorites: Array<{ name: string; realm: string }> = cachedFavorites ? JSON.parse(cachedFavorites) : [];
    if (
      !favorites.some((favorite: { name: string; realm: string }) => favorite.name === name && favorite.realm === realm)
    ) {
      cache.set("favorites", JSON.stringify([...favorites, { name, realm }]));
      showToast({
        title: `Character ${name} on ${realm} added to favorites!`,
      });
      launchCommand({ name: "favorite-characters", type: LaunchType.UserInitiated });
    } else {
      showToast({
        title: `Character ${name} is already a favorite`,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open RaiderIO Profile"
            url={`https://raider.io/characters/us/${realm}/${name}`}
          />
          <Action title="Add to Favorites" onAction={addToFavorites} />
          <Action
            title="Open Favorites"
            onAction={() => launchCommand({ name: "favorite-characters", type: LaunchType.UserInitiated })}
            shortcut={{ modifiers: ["shift"], key: "f" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Look up the RaiderIO profile for your character." />
      <Form.Dropdown id="realm" title="Realm" value={realm} onChange={setRealm}>
        {REALMS.map((realm) => (
          <Form.Dropdown.Item value={realm.slug} title={realm.name.en_US} key={realm.id} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="name" title="Character Name" placeholder="Enter name" value={name} onChange={setName} />
    </Form>
  );
}
