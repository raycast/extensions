import { useEffect, useState } from "react";
import { List, showToast, Toast, Icon } from "@raycast/api";
import { getDailyWord } from "./api/rae";
import { WordEntryFC } from "./components/WordEntry";
import { WordEntry } from "./api/rae";

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
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: String(e),
        });
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
