import { useState, useEffect } from "react";
import { Action, ActionPanel, List, showHUD, popToRoot, getPreferenceValues } from "@raycast/api";
import { configureAxios } from "./utils";
import { Suggestion } from "./types";
import axios from "axios";

const preferences = getPreferenceValues<Preferences>();
configureAxios(preferences.apiKey);

export default function Command() {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axios
      .get("/api/raycast/swap/suggestions/")
      .then((response) => {
        setSuggestions(response.data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      });
  }, []);

  return (
    <List isLoading={isLoading}>
      {suggestions.map((suggestion: Suggestion) => (
        <List.Item
          key={suggestion.id}
          title={suggestion.name}
          subtitle={`${suggestion.artist.name}`}
          icon={{
            source: suggestion.master_child_song.album.image.px64,
          }}
          actions={
            <ActionPanel>
              <Action
                title="Choose Song"
                onAction={() => swapSong(suggestion.master_child_song.uri, suggestion.name)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function swapSong(uri: any, name: any) {
  axios
    .get("/api/raycast/swap/set/", { params: { uri: uri } })
    .then(() => {
      showHUD(`Playing ${name}`);
      popToRoot();
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
}
