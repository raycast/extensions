import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  List,
  Icon,
  LocalStorage,
  LaunchProps,
  openExtensionPreferences,
  Alert,
  confirmAlert,
  Color,
} from "@raycast/api";
import moment from "moment";
import { getTranslationText } from "./api";

interface I_searchTexts {
  [key: string]: string;
}

const PapagoTranslate = (props: LaunchProps<{ arguments: { initializeText: string } }>) => {
  const { initializeText } = props.arguments;

  const [isLoading, setIsLoading] = useState(true);
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
      const result = await fetchData();
      if (result?.status === 200) {
        const translatedText = result?.translatedText;
        await LocalStorage.setItem(createRandomKey(), JSON.stringify({ searchText, translatedText }));
      }
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

  const deleteAllItemInStorage = async () => {
    await confirmAlert({
      title: "Remove History",
      message: "Do you want to remove all history?",
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: {
        title: "Yes",
        style: Alert.ActionStyle.Destructive,
        onAction: () => {
          setIsLoading(true);
          void LocalStorage.clear();
          setSearchText("");
          void getAllSearchTextFromStore();
          setIsLoading(false);
        },
      },
    });
  };

  const deleteSingleItemInStorage = async (key: string) => {
    await confirmAlert({
      title: "Remove Item",
      message: "Do you want to remove this item in history?",
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: {
        title: "Yes",
        style: Alert.ActionStyle.Destructive,
        onAction: () => {
          setIsLoading(true);
          LocalStorage.removeItem(key);
          getAllSearchTextFromStore();
          setIsLoading(false);
        },
      },
    });
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
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Translated Text to Clipboard"
                    content={JSON.parse(value).translatedText}
                  />
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    url={`https://papago.naver.com/?&st=${encodeURIComponent(JSON.parse(value).searchText.trim())}`}
                  />
                  <Action
                    title="Remove This Item in History"
                    onAction={() => {
                      void deleteSingleItemInStorage(key);
                    }}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    icon={Icon.Trash}
                  />
                  <Action
                    title="Remove All History"
                    onAction={deleteAllItemInStorage}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                    icon={Icon.Trash}
                  />
                </ActionPanel.Section>
                <Action title="Settings" onAction={openExtensionPreferences} icon={Icon.Gear} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
};

export default PapagoTranslate;
