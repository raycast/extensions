import { useEffect, useState } from "react";
import { Action, ActionPanel, List, Icon, LocalStorage, LaunchProps, openExtensionPreferences } from "@raycast/api";
import moment from "moment";
import { getTranslationText } from "./api";

interface I_searchTexts {
  [key: string]: string;
}

const PapagoTranslate = (props: LaunchProps<{ arguments: { initializeText: string } }>) => {
  const { initializeText } = props.arguments;

  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState(initializeText ?? "");
  const [searchTexts, setSearchTexts] = useState<I_searchTexts>({});

  const fetchData = async () => {
    return await getTranslationText(searchText);
  };

  const createRandomKey = () => {
    return moment().format("YYYYMMDDhhmmssss");
  };

  const setSearchTextInStore = async () => {
    if (searchText !== "") {
      const translatedText = await fetchData();
      await LocalStorage.setItem(createRandomKey(), JSON.stringify({ searchText, translatedText }));
    }
  };

  const getAllSearchTextFromStore = async () => {
    await LocalStorage.allItems().then((response) => {
      setSearchTexts(response);
    });
  };

  const translateProcess = async () => {
    setIsLoading(true);
    await setSearchTextInStore();
    await getAllSearchTextFromStore();
    setIsLoading(false);
  };

  const clearHistory = () => {
    setIsLoading(true);
    void LocalStorage.clear();
    setSearchText("");
    void getAllSearchTextFromStore();
    setIsLoading(false);
  };

  useEffect(() => {
    void translateProcess();
  }, [searchText]);

  return (
    <List
      throttle={true}
      filtering={false}
      isShowingDetail={true}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="word or sentence"
      searchBarPlaceholder="Please enter a word or sentence"
    >
      {Object.entries(searchTexts)
        .sort()
        .reverse()
        .map(([key, value], index) => (
          <List.Item
            key={`${key}_${index}`}
            title={JSON.parse(value).searchText}
            detail={<List.Item.Detail markdown={JSON.parse(value).translatedText} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Translated Text to Clipboard"
                  content={JSON.parse(value).translatedText}
                />
                <Action title="Remove All History" onAction={clearHistory} icon={Icon.Trash} />
                <Action title="Setting" onAction={openExtensionPreferences} icon={Icon.Gear} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
};

export default PapagoTranslate;
