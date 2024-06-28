import { useEffect, useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  LocalStorage,
  Icon,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import CollectionsView from "./CollectionsView";

interface Preferences {
  accessToken: string;
  fileKey: string;
}

export default function Command() {
  const { accessToken, fileKey } = getPreferenceValues<Preferences>();
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const fetchTokens = async () => {
      if (accessToken && fileKey) {
        setShowResults(true);
      }
    };
    fetchTokens();
  }, []);

  const saveTokensAndShowResults = () => {
    LocalStorage.setItem("accessToken", accessToken);
    LocalStorage.setItem("fileKey", fileKey);
    setShowResults(true);
  };

  return showResults ? (
    <CollectionsView accessToken={accessToken} fileKey={fileKey} onEditTokens={() => setShowResults(false)} />
  ) : (
    <Form
      actions={
        <ActionPanel>
          <Action title="Fetch Variables" onAction={saveTokensAndShowResults} icon={Icon.Download} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    ></Form>
  );
}
