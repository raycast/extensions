import { useEffect, useState } from "react";
import { List, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getDailyWord, WordEntry } from "./api/rae";
import { WordEntryFC } from "./components/WordEntry";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [wordEntry, setWordEntry] = useState<WordEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDailyWord() {
      try {
        const entry = await getDailyWord();
        setWordEntry(entry);
      } catch (e) {
        setError(String(e));
        showFailureToast(e, { title: "Error" });
      } finally {
        setIsLoading(false);
      }
    }

    fetchDailyWord();
  }, []);

  return (
    <List isLoading={isLoading}>
      {error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="No se pudo cargar la palabra del día" description={error} />
      ) : wordEntry ? (
        <WordEntryFC wordEntry={wordEntry} />
      ) : null}
    </List>
  );
}
