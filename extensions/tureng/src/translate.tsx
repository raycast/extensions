import { ActionPanel, Action, List, LaunchProps } from "@raycast/api";
import { getTranslations } from "./utils/getTranslations";
import { getAutocomplete } from "./utils/autocomplete";
import { useEffect, useState } from "react";

const URL = "https://tureng.com/en/turkish-english/";

function TranslationsListItem(props: { item: string; updateQuery: (term: string) => void }) {
  const searchForTranslation = () => {
    props.updateQuery(props.item);
  };

  return (
    <List.Item
      title={props.item}
      key={props.item}
      actions={
        <ActionPanel>
          <Action title="Search for This Entry" onAction={searchForTranslation} />
          <Action.CopyToClipboard title="Copy Translation" content={props.item} />
          <Action.OpenInBrowser title="Open in Browser" url={URL + props.item} />
        </ActionPanel>
      }
    />
  );
}

function AutocompleteListItem(props: { item: string; selectItem: (item: string) => void }) {
  return (
    <List.Item
      title={props.item}
      key={props.item}
      actions={
        <ActionPanel>
          <Action title="Search for This Item" onAction={() => props.selectItem(props.item)} />
        </ActionPanel>
      }
    />
  );
}

export default function Command(props: LaunchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [autocompleteResults, setAutocompleteResults] = useState<string[]>([]);

  const [data, setData] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (props.launchContext?.term) {
      updateQuery(props.launchContext?.term);
    }
  }, []);

  const updateQuery = (term: string) => {
    setIsLoading(true);
    setSearchTerm(term);
    getTranslations(term)
      .then(setData)
      .then(() => setIsLoading(false));
  };

  const updateSearchTerm = (text: string) => {
    setSearchTerm(text);
    setAutocompleteResults([]);
    setData([]);

    if (text.length >= 3) {
      setIsLoading(true);
      getAutocomplete(text).then((res) => {
        setAutocompleteResults(res);
        setIsLoading(false);
      });
    }
  };

  return (
    <List
      searchBarPlaceholder="Turkish or English"
      throttle
      isLoading={isLoading}
      searchText={searchTerm}
      onSearchTextChange={updateSearchTerm}
    >
      {data.length > 0 ? (
        <>
          {data.map((item) => (
            <TranslationsListItem item={item} updateQuery={updateQuery} key={item} />
          ))}
          <List.Item
            title={"More results at Tureng.com"}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={`https://tureng.com/en/turkish-english/${searchTerm}`}
                ></Action.OpenInBrowser>
              </ActionPanel>
            }
          />
        </>
      ) : (
        autocompleteResults.map((item, idx) => <AutocompleteListItem item={item} key={idx} selectItem={updateQuery} />)
      )}
    </List>
  );
}
