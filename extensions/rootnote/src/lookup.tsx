import { useState, useEffect } from "react";
import { Action, ActionPanel, List, Detail, getPreferenceValues } from "@raycast/api";
import { Suggestion } from "./types";
import { getBaseURL, configureAxios } from "./utils";
import axios from "axios";

const preferences = getPreferenceValues<Preferences>();
configureAxios(preferences.apiKey);

export default function Command() {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axios
      .get("/api/raycast/insights/")
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
    <List isLoading={isLoading} isShowingDetail={true} searchBarPlaceholder="Search songs...">
      {suggestions.map((suggestion: Suggestion) => {
        return (
          <List.Item
            key={suggestion.id}
            title={suggestion.name}
            subtitle={`${suggestion.artist.name}`}
            icon={{ source: suggestion.master_child_song.album.image.px64 }}
            detail={
              <List.Item.Detail
                metadata={
                  <Detail.Metadata>
                    <Detail.Metadata.Label title="Name" text={suggestion.name} />
                    <Detail.Metadata.Label title="Artist" text={suggestion.artist.name} />
                    <Detail.Metadata.Label title="Album" text={suggestion.master_child_song.album.name} />
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Label title="Your streams" text={suggestion.stream_count.toString()} />
                  </Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title={"Open in Rootnote"} url={getBaseURL() + "/songs/c/" + suggestion.id} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
