import { Action, ActionPanel, Grid } from "@raycast/api";
import { useState } from "react";
import { letters, numbers } from "./constants/letters";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  return (
    <Grid
      columns={11}
      navigationTitle="Arabic Keyboard"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Choose the letter or number you want to copy"
    >
      <Grid.Section title={"Letters"}>
        {letters.map((letter) => (
          <Grid.Item
            key={letter.content}
            content={letter.path}
            title={letter.keywords.join(", ")}
            actions={
              <ActionPanel>
                <Action
                  title="Select"
                  onAction={() => setSearchText((prevSearchText) => prevSearchText + letter.content)}
                />
                <Action.CopyToClipboard content={searchText} />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
      <Grid.Section title={"Numbers"}>
        {numbers.map((number) => (
          <Grid.Item
            key={number.content}
            content={number.path}
            title={number.keywords.join(", ")}
            actions={
              <ActionPanel>
                <Action
                  title="Select"
                  onAction={() => setSearchText((prevSearchText) => prevSearchText + number.content)}
                />
                <Action.CopyToClipboard content={searchText} />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}
