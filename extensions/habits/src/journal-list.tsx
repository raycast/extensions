import { Action, ActionPanel, Cache, List, showToast, Toast, useNavigation } from "@raycast/api";

import SetSecret from "./components/set-secret";
import { useEffect, useState } from "react";
import fetch from "node-fetch";

import { JournalEntry } from "./models/journal-entry";
import JournalCommand from "./journal";

const cache = new Cache();

export default function JournalListCommand() {
  const secret = cache.get("secret");
  const navigation = useNavigation();

  const [loading, setLoading] = useState<boolean>(false);
  const [entries, setEntries] = useState<JournalEntry[] | undefined>();

  useEffect(() => {
    if (secret) {
      const fetchData = async () => {
        await retrieveJournalEntries();
      };

      fetchData();
    }
  }, []);

  const retrieveJournalEntries = async () => {
    try {
      setLoading(true);
      const res = await fetch(`https://www.supahabits.com/api/journal?secret=${secret}`).then(res => res.json());
      setEntries(res as JournalEntry[]);
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Failed to retrieve habits" });
    } finally {
      setLoading(false);
    }
  };

  if (!secret) {
    return <SetSecret />;
  }

  if (loading) {
    return <List isLoading={true} />;
  }

  return (
    <List
      filtering={true}
      navigationTitle="Search Journal Entries"
      searchBarPlaceholder="Filter entries by content"
    >
      {
        entries && entries.length === 0
        && <List.Item title="No entries found" actions={
          <ActionPanel>
            <Action title="New entry" onAction={() => navigation.push(<JournalCommand />)} />
          </ActionPanel>
        } />
      }

      {entries && entries.map((item) => (
        <List.Item
          key={item.id}
          title={item.content}
        />
      ))}
    </List>
  );
}
