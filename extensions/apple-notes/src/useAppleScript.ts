import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import { Date as Sugar } from "sugar";
import { NoteItem } from "./types";
import { PermissionErrorTypes, testPermissionErrorType } from "./errors";

export const useAppleScriptNotes = (showModifiedAt: boolean) => {
  const [appleScriptState, setAppleScriptState] = useState({
    notes: [] as NoteItem[],
    isLoading: true,
    error: null as PermissionErrorTypes | null,
  });

  function parseNotes(result: string) {
    const lines = result.split("\n");

    const notes: NoteItem[] = [];
    const processedNotes: string[] = [];
    let lastAccount = "";
    let lastFolder = "";
    let lastNote: NoteItem | null = null;
    let atLeastOneId = false;

    for (const line of lines) {
      const [key, ...rest] = line.split(": ");
      const value = rest.join(": ");

      switch (key) {
        case "account":
          lastAccount = value;
          break;
        case "folder":
          lastFolder = value;
          break;
        case "id":
          lastNote = {
            id: value,
          } as NoteItem;
          atLeastOneId = true; // to ensure any cached items have ids
          break;
        case "title":
          if (lastNote) {
            lastNote.title = value;
            lastNote.folder = lastFolder;
            lastNote.account = lastAccount;
            if (!processedNotes.includes(lastNote.id)) {
              notes.push(lastNote);
              processedNotes.push(lastNote.id);
            }
          }
          break;
        case "date":
          if (lastNote) {
            lastNote.modifiedAt = parseDateString(value);
          }
          break;
      }
    }

    // if our cache/results don't have ids - it is the pre-id cache, and we need to not set state.
    if (!atLeastOneId) {
      return;
    }
    setAppleScriptState({ notes: notes, isLoading: false, error: null });
  }

  async function checkCachedNotes() {
    const cachedNotes = (await LocalStorage.getItem("notes")) as string;
    if (cachedNotes) {
      parseNotes(cachedNotes);
    }
  }

  function parseDateString(date: string): Date {
    date = date.replace(/([0-9]+).([0-9]+).([0-9]+)$/, "$1:$2:$3"); // fix for time format

    let parsedDate = Sugar.create(date);
    if (!Sugar.isValid(parsedDate)) {
      parsedDate = Sugar.create();

      if (showModifiedAt) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid date format",
          message: `Date ${date} could not be parsed.`,
        });
      }
    }

    return parsedDate;
  }

  async function fetchItems() {
    try {
      const result = await runAppleScript(
        'set output to ""\n' +
          'tell application "Notes"\n' +
          "  repeat with theAccount in every account\n" +
          "    set theAccountName to the name of theAccount\n" +
          '    set output to output & "account: " & theAccountName & "\n"\n' +
          "    repeat with theFolder in every folder in theAccount\n" +
          "      set theFolderName to the name of theFolder\n" +
          '      set output to output & "folder: " & theFolderName & "\n"\n' +
          "      repeat with theNote in every note in theFolder\n" +
          "        set theNoteID to the id of theNote\n" +
          "        set theNoteName to the name of theNote\n" +
          (showModifiedAt ? "set theNoteDate to the modification date of theNote\n" : "") +
          '        set output to output & "id: " & theNoteID & "\n"\n' +
          (showModifiedAt ? 'set output to output & "date: " & theNoteDate & "\n"\n' : "") +
          '        set output to output & "title: " & theNoteName & "\n"\n' +
          "      end repeat\n" +
          "    end repeat\n" +
          "  end repeat\n" +
          "end tell\n" +
          "return output"
      );
      parseNotes(result);

      await LocalStorage.setItem("notes", result);
    } catch (error) {
      const parsedError = testPermissionErrorType(error);
      if (parsedError !== "unknown") {
        setAppleScriptState((prevState) => {
          return {
            ...prevState,
            error: parsedError,
          };
        });
      } else {
        throw error;
      }
    }
  }

  useEffect(() => {
    fetchItems();
    checkCachedNotes();
  }, []);

  return appleScriptState;
};
