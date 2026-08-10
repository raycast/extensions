import { Cache, Color, getPreferenceValues, List } from "@raycast/api";
import CustomActionPanel from "./components/customActionPanel";
import useCommitMessages from "./hooks/commitMessages";
import useUrlParser from "./hooks/urlParser";

const cache = new Cache();

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const { issue, setEntry } = useUrlParser({ cache });
  const { commitMessages } = useCommitMessages({ preferences, issue });

  return (
    <List
      searchBarPlaceholder="Paste the url of your issue, then add description and body with ',' separator"
      searchText={issue.entry}
      onSearchTextChange={setEntry}
    >
      {commitMessages.map((commit, index) => (
        <List.Item
          id={commit.label}
          key={commit.label}
          title={commit.message}
          accessories={
            preferences.typeMode === "gitmoji"
              ? [{ tag: { value: commit.label, color: Color.SecondaryText } }]
              : [{ icon: commit.accessoryIcon, tooltip: index < 9 ? `⌘+${index + 1}` : undefined }]
          }
          actions={<CustomActionPanel commit={commit} preferences={preferences} />}
        />
      ))}
    </List>
  );
}
