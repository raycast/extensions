import { useState, useCallback, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";

import { useSqlite } from "./useSql";
import { Contact, useContacts } from "./useContacts";

export interface Message {
  readonly id: string;
  readonly timestamp: Date;
  readonly text: string;
  readonly contactId: string | null;
  readonly contact: Contact | null;
}

export interface UseMessagesConfig {
  readonly messagesDbPath: string;
  readonly contactsDbPath: string;
}

export interface SearchState {
  readonly messages: Message[];
  readonly isLoading: boolean;
}

export const useMessages = (config: UseMessagesConfig) => {
  const { db, isLoading, error } = useSqlite(config.messagesDbPath);
  const contacts = useContacts(config.contactsDbPath);

  const [searchResults, setSearchResults] = useState<SearchState>({ messages: [], isLoading: true });

  const search = useCallback(
    (search: string) => {
      if (!db.current) {
        setSearchResults((oldState) => ({
          ...oldState,
          messages: [],
          isLoading: false,
        }));
        return;
      }

      const query = `
    SELECT
      message.guid,
      handle.id as handle_id,
      message.date,
      datetime(message.date/1000000000 + strftime("%s", "2001-01-01") ,"unixepoch","localtime") as date_utc,
      message.text
    FROM message
      LEFT JOIN handle
        ON handle.ROWID = message.handle_id
      WHERE message.text LIKE '%${search}%'
    ORDER BY message.date DESC
    LIMIT 10
    `;

      try {
        const newResults = new Array<Message>();
        const statement = db.current.prepare(query);

        while (statement.step()) {
          const result = statement.getAsObject() as any;

          newResults.push({
            id: result.guid,
            text: result.text,
            timestamp: new Date(result.date_utc),
            contactId: result.handle_id,
            contact: contacts.find(result.handle_id),
          });
        }

        statement.free();
        setSearchResults((oldState) => ({
          ...oldState,
          messages: newResults,
          isLoading: false,
        }));
      } catch (error) {
        setSearchResults((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
      }
    },
    [setSearchResults]
  );

  useEffect(() => {
    search("");
  }, []);

  return {
    search,
    searchResults,
    error,
    isLoading,
  };
};
