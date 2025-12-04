import { List, showToast, Toast, Action, ActionPanel } from "@raycast/api";
import axios from "axios";
import { useState } from "react";

const VOCAB_API_URL = "https://vocabulary.vercel.app";
const VOCAB_DICTIONARY_PAGE_URL = "https://www.vocabulary.com/dictionary";

export default function Command() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);

  const onSearchTextChange = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await axios.get(`${VOCAB_API_URL}/words/${query}`);
      if (response.status === 200) {
        console.log("response.data", response.data.data);
        setWords(response.data.data);
      }
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch words",
        message: "Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!words) return;

  return (
    <List
      filtering={false}
      onSearchTextChange={onSearchTextChange}
      throttle={true}
      isLoading={loading}
      searchBarPlaceholder="Search word..."
    >
      {words.map((word: { word: string; description: string }, i: number) => {
        return <List.Item key={i} subtitle={word.description} title={word.word} actions={WordActions(word.word)} />;
      })}
    </List>
  );
}

function WordActions(word: string) {
  const dictionaryPageUrl = `${VOCAB_DICTIONARY_PAGE_URL}/${encodeURIComponent(word)}`;

  return (
    <ActionPanel>
      <Action.OpenInBrowser url={dictionaryPageUrl} />
    </ActionPanel>
  );
}
