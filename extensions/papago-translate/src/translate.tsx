import {
  ActionPanel,
  List,
  Action,
  getPreferenceValues,
  openExtensionPreferences,
  openCommandPreferences,
  Detail,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import useTranslateText from "./hooks/useTranslateText";
import LanguageDropdown from "./languageDropdown";
import { useIsErrorCodeValue, useIsLoadingAtom } from "./atoms/status";

const preferences = getPreferenceValues<Preferences>();

const Translate = () => {
  const translateText = useTranslateText();
  const { target } = preferences;

  const [isLoading, setIsLoading] = useIsLoadingAtom();
  const [searchText, setSearchText] = useState<string>("");
  const [translatedText, setTranslatedText] = useState<string>("");
  const isErrorCode = useIsErrorCodeValue();

  const onChangeTargetLang = (targetLang: string) => {
    if (targetLang !== target) {
      showToast(Toast.Style.Animated, "Open Extension Preferences");
      setTimeout(() => {
        openExtensionPreferences();
      }, 1000);
    }
  };

  const setTranslateResult = async () => {
    const translateTextResult = await translateText(searchText);
    setTranslatedText(translateTextResult);
    setIsLoading(false);
  };

  useEffect(() => {
    if (searchText === "") {
      return;
    }
    setIsLoading(true);
    setTranslatedText("");

    setTranslateResult();
  }, [searchText]);

  if (isErrorCode) {
    let markdown: string;

    switch (isErrorCode) {
      case 400:
        markdown = "This setting cannot be requested. Please check the settings again.";
        break;
      case 401:
        markdown = "An authentication error has occurred. Please check Client Id, Client Secret again.";
        break;
      case 429:
        markdown = "API daily allowance exceeded. Please contact the PAPAGO site.";
        break;
      case 500:
        markdown = "There was a problem with the server. Please contact the PAPAGO site.";
        break;
      default:
        markdown = "An unknown error occurred. Please check the settings again.";
        break;
    }

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      searchBarPlaceholder="Type the text to translate"
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      searchBarAccessory={<LanguageDropdown onChangeTargetLang={onChangeTargetLang} />}
      throttle
    >
      <List.Item
        title={translatedText || "No Result"}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy To Clipboard" content={translatedText} />
            <Action.OpenInBrowser title="Open in Browser" url={`https://papago.naver.com/?&st=${searchText}`} />
          </ActionPanel>
        }
      />
    </List>
  );
};

export default Translate;
