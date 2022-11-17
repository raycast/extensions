import {Action, ActionPanel, getPreferenceValues, Grid, Icon} from "@raycast/api";
import onAuth from "./hooks/onAuth";
import onSearchIcons from "./hooks/onSearchIcons";
import {useState} from "react";
import copyFileToClipboard from "./functions/copyFileToClipboard";

const {apiKey} = getPreferenceValues();

// noinspection JSUnusedGlobalSymbols
export default function CommandSearch() {
  const [search, setSearch] = useState("");
  const auth = onAuth(apiKey);
  const results = onSearchIcons(auth.token, search);

  const isLoading = auth.isLoading || results.isLoading;

  return <Grid isLoading={isLoading} onSearchTextChange={setSearch} throttle>
    {results.data?.length === 0 && <Grid.EmptyView title={search.length > 0 ? 'Nothing was found' : 'FlatIcon'}/>}
    {results.data?.map(
      ({id, images, description, tags}) => <Grid.Item
        key={id}
        content={images["512"]}
        subtitle={description}
        keywords={tags && tags.length > 0 ? tags.split(",") : undefined}
        actions={<ActionPanel>
          <Action
            title="Copy to Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={() => copyFileToClipboard({url: images["512"]})}
          />
          <Action.OpenInBrowser url={images["512"]} title="Open in Browser"/>
          <Action.OpenInBrowser
            url={`https://www.flaticon.com/free-icon/whatever_${id}`}
            title="Open Icon Page"
          />
        </ActionPanel>}
      />
    )}
  </Grid>
}
