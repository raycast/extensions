import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { NoteReducerAction } from "./reducers";
import { MediaState } from "./interfaces";
import { sortByAlphabet } from "./utils";
import fs from "fs";
import { ObsidianVaultsState, Vault } from "../api/vault/vault.types";
import { Note } from "../api/vault/notes/notes.types";
import { loadMedia, loadObsidianJson, parseVaults } from "../api/vault/vault.service";
import { getNotesFromCache } from "../api/cache/cache.service";
import { Logger } from "../api/logger/logger.service";

const logger = new Logger("Hooks");

export const NotesContext = createContext([] as Note[]);
export const NotesDispatchContext = createContext((() => {}) as (action: NoteReducerAction) => void);

export function useNotes(vault: Vault, bookmarked = false) {
  /**
   * The preferred way of loading notes inside the extension
   *
   * @param vault - The Vault to get the notes from
   * @returns All notes in the cache for the vault
   */

  const notes_: Note[] = getNotesFromCache(vault);

  const [notes] = useState<Note[]>(notes_);
  logger.info("useNotes hook called");
  if (bookmarked) {
    return [notes.filter((note: Note) => note.bookmarked)] as const;
  } else {
    return [notes] as const;
  }
}

export function useNotesContext() {
  return useContext(NotesContext);
}

export function useNotesDispatchContext() {
  return useContext(NotesDispatchContext);
}

export function useMedia(vault: Vault) {
  const [media, setMedia] = useState<MediaState>({
    ready: false,
    media: [],
  });

  logger.info("useMedia hook called");

  useEffect(() => {
    async function fetch() {
      if (!media.ready) {
        try {
          await fs.promises.access(vault.path + "/.");

          const media = loadMedia(vault).sort((m1, m2) => sortByAlphabet(m1.title, m2.title));

          setMedia({ ready: true, media });
        } catch (error) {
          showToast({
            title: "The path set in preferences doesn't exist",
            message: "Please set a valid path in preferences",
            style: Toast.Style.Failure,
          });
        }
      }
    }
    fetch();
  }, []);

  return media;
}

export function useObsidianVaults(): ObsidianVaultsState {
  const pref = useMemo(() => getPreferenceValues(), []);
  const [state, setState] = useState<ObsidianVaultsState>(
    pref.vaultPath
      ? {
          ready: true,
          vaults: parseVaults(),
        }
      : { ready: false, vaults: [] }
  );

  logger.info("useObsidianVaults hook called");

  useEffect(() => {
    if (!state.ready) {
      loadObsidianJson()
        .then((vaults) => {
          setState({ vaults, ready: true });
        })
        .catch(() => setState({ vaults: parseVaults(), ready: true }));
    }
  }, []);

  return state;
}
