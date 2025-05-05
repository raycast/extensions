import { useEffect, useState } from "react";
import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getRandomWord, WordEntry } from "./api/rae";
import { WordEntryFC } from "./components/WordEntry";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [wordEntry, setWordEntry] = useState<WordEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRandomWord = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const entry = await getRandomWord();
      setWordEntry(entry);
    } catch (e) {
      setError(String(e));
      showFailureToast(e, { title: "Error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomWord();
  }, []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Palabra aleatoria del diccionario RAE"
      searchBarPlaceholder="Cargando palabra aleatoria..."
      actions={
        <ActionPanel>
          <Action
            title="Cargar Otra Palabra Aleatoria"
            onAction={fetchRandomWord}
            icon={Icon.Repeat}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No se pudo cargar una palabra aleatoria"
          description={`${error}. Intenta de nuevo.`}
          actions={
            <ActionPanel>
              <Action title="Intentar De Nuevo" onAction={fetchRandomWord} icon={Icon.Repeat} />
            </ActionPanel>
          }
        />
      ) : wordEntry ? (
        <WordEntryFC wordEntry={wordEntry} />
      ) : (
        <List.EmptyView title="Cargando..." />
      )}
    </List>
  );
}
