import {
  Color,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Note } from "./bear-db";
import { useBearDb } from "./hooks";

export default function MenuBar() {
  const [db, error] = useBearDb();
  const [notes, setNotes] = useState<Note[]>();

  useEffect(() => {
    if (db != null) {
      setNotes(db.getNotes(""));
    }
  }, [db]);

  if (error) {
    showToast(Toast.Style.Failure, "Something went wrong", error.message);
  }

  return (
    <MenuBarExtra isLoading={notes == undefined} icon={{ source: "bear-icon.png", tintColor: Color.PrimaryText }}>
      {notes?.map((note) => {
        return (
          <MenuBarExtra.Item
            key={note.id}
            icon={note.encrypted ? Icon.Lock : undefined}
            title={
              note.title === ""
                ? "Untitled Note"
                : note.title.length > 40
                  ? note.title.substring(0, 40) + "…"
                  : note.title
            }
            subtitle={note.formattedTags}
            onAction={() => open(`bear://x-callback-url/open-note?id=${note.id}`)}
          />
        );
      })}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="New Note"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() => launchCommand({ name: "new-note", type: LaunchType.UserInitiated })}
        />

        <MenuBarExtra.Item
          title="Search"
          icon={Icon.MagnifyingGlass}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={() => open(`bear://x-callback-url/search`)}
        />

        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
