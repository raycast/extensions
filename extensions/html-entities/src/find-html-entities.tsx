import { ActionPanel, List, Action, Cache, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { EntitiesResponse } from "./types";
import { filterEntities } from "./lib";

interface Preferences {
  defaultPasteMode: "code" | "character";
}

const cache = new Cache();

const CACHE_KEY = "entities";

const ENTITIES_URL = "https://html.spec.whatwg.org/entities.json";

const getCachedEntities = () => {
  const cachedEntities = cache.get(CACHE_KEY);
  return cachedEntities ? (JSON.parse(cachedEntities) as EntitiesResponse) : null;
};

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const preferences = getPreferenceValues<Preferences>();

  const initialData = getCachedEntities();

  const { data: entities, isLoading } = useFetch(ENTITIES_URL, {
    initialData,
    parseResponse: (response) => response.json() as Promise<EntitiesResponse>,
    onData(data) {
      cache.set(CACHE_KEY, JSON.stringify(data));
    },
  });

  return (
    <List isLoading={isLoading} isShowingDetail filtering={false} onSearchTextChange={setSearchText}>
      {filterEntities(entities, searchText).map(([name, details]) => (
        <List.Item
          detail={
            <List.Item.Detail
              markdown={`# ${details.characters}\n\n\`\`\`${name}\`\`\`\n\n\`\`\`&#${details.codepoints[0]};\`\`\``}
            />
          }
          key={name}
          title={details.characters}
          keywords={[
            name,
            name.replace(/&/, ""),
            name.replace(/;/, ""),
            ...details.codepoints.map((cp) => cp.toString()),
          ]}
          subtitle={name}
          actions={
            <ActionPanel>
              {preferences.defaultPasteMode === "code" && (
                <>
                  <Action.Paste title="Paste Entity Code" content={name} />
                  <Action.Paste title="Paste Entity" content={details.characters} />
                </>
              )}

              {preferences.defaultPasteMode === "character" && (
                <>
                  <Action.Paste title="Paste Entity" content={details.characters} />
                  <Action.Paste title="Paste Entity Code" content={name} />
                </>
              )}

              <Action.Paste title="Paste Entity Number" content={details.codepoints[0]} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
