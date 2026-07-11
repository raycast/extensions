import { Toast, showToast, trash, openExtensionPreferences } from "@raycast/api";
import { TAGS_FILE_PATH, TODO_FILE_PATH, preferences } from "./services/config";
import { exportNotes, getInitialValuesFromFile, getRandomColor, getSyncWithDirectory } from "./utils/utils";
import { Tag } from "./services/atoms";
import fs from "fs";

export default async function Command() {
  const filePath = preferences.fileLocation;
  if (!filePath) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Auto Save Location Set",
      message: "Set a folder in the extension settings",
      primaryAction: {
        title: "Open Extension Settings",
        onAction: () => openExtensionPreferences(),
      },
    });
    return;
  }
  try {
    const { notes: newNotes, staleFiles } = await getSyncWithDirectory(filePath);
    fs.writeFileSync(TODO_FILE_PATH, JSON.stringify(newNotes, null, 2));

    // Register tags imported from file frontmatter so they show up in tag pickers
    const tags = getInitialValuesFromFile(TAGS_FILE_PATH) as Tag[];
    const knownTags = new Set(tags.map((tag) => tag.name));
    const importedTags = new Set(newNotes.flatMap((note) => note.tags).filter((tag) => !knownTags.has(tag)));
    if (importedTags.size > 0) {
      const newTags = [...importedTags].map((name) => ({ name, color: getRandomColor().name }));
      fs.writeFileSync(TAGS_FILE_PATH, JSON.stringify([...tags, ...newTags], null, 2));
    }

    // Write notes back so every file in the folder has up-to-date frontmatter and an H1 title
    await exportNotes(filePath, newNotes);

    // Trash files superseded by a title rename in frontmatter, now exported under their new name
    if (staleFiles.length > 0) {
      await trash(staleFiles);
    }

    await showToast({ style: Toast.Style.Success, title: "Notes Synced" });
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, title: typeof e === "string" ? e : "Error Syncing Notes" });
  }
}
