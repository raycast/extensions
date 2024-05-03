import { Action, ActionPanel, Detail, List, closeMainWindow } from "@raycast/api";
import fetch, { FetchError } from "node-fetch";
import { runAppleScript } from "run-applescript";
import { useCallback, useEffect, useState } from "react";

export default function Command() {
  const [decks, setDecks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAnkiUnavailableMessage, setShowAnkiUnavailableMessage] = useState<boolean>(false);

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        setDecks(await invokeAnkiConnectAction("deckNames", 6));
      } catch (error) {
        console.error(error);

        if (error instanceof Error && isFetchError(error) && error.code === "ECONNREFUSED") {
          setShowAnkiUnavailableMessage(true);
        }
      }
      setIsLoading(false);
    };

    fetchDecks();
  }, []);

  const handleOpenDeck = useCallback((deckName: string) => {
    closeMainWindow();
    openAnki();
    invokeAnkiConnectAction("guiDeckOverview", 6, { name: deckName });
  }, []);

  const handleOpenDeckReview = useCallback((deckName: string) => {
    closeMainWindow();
    openAnki();
    invokeAnkiConnectAction("guiDeckReview", 6, { name: deckName });
  }, []);

  const handleOpenAnki = useCallback(() => {
    openAnki();
  }, []);

  if (showAnkiUnavailableMessage) {
    return (
      <Detail
        markdown="Anki-Connect is unavailable. Make sure that [Anki](https://apps.ankiweb.net) app is open and [Anki-Connect](https://ankiweb.net/shared/info/2055492159) addon is installed. Also there is a known issue that Anki app can be suspended by MacOS, the workaround is [here](https://foosoft.net/projects/anki-connect/index.html#notes-for-windows-users)."
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action title={"Open Anki"} onAction={handleOpenAnki} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading}>
      {decks?.map((name) => (
        <List.Item
          key={name}
          title={name.replaceAll("::", " > ")}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title={"Open Deck Overview"} onAction={() => handleOpenDeck(name)} />
                <Action title={"Open Deck Review"} onAction={() => handleOpenDeckReview(name)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type AnkiConnectRes<T> = {
  result: T;
  error: string | null;
};

async function invokeAnkiConnectAction<T>(action: string, version: number, params = {}) {
  const response = await fetch("http://127.0.0.1:8765", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, version, params }),
  });

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const data = (await response.json()) as AnkiConnectRes<T>;

  if (Object.getOwnPropertyNames(data).length != 2) {
    throw new Error("Response has an unexpected number of fields");
  }
  if (data.error === undefined) {
    throw new Error("Response is missing required error field");
  }
  if (data.result === undefined) {
    throw new Error("Response is missing required result field");
  }
  if (data.error) {
    throw new Error(data.error);
  }

  console.log(data);

  return data.result;
}

async function openAnki() {
  await runAppleScript(`
    tell application "Anki"
      activate
    end tell

    tell application "System Events"
      set allWindows to every window of processes whose name contains "Anki"
      repeat with thisWindow in allWindows
          if name of thisWindow contains "Anki" then
              set frontmost of thisWindow to true
              return
          end if
      end repeat
    end tell
  `);
}

function isFetchError(error: Error): error is FetchError {
  if (error.name === "FetchError") {
    return true;
  }

  return false;
}
