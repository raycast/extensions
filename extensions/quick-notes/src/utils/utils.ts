import { environment, showToast } from "@raycast/api";
import { Note, Tag } from "../services/atoms";
import slugify from "slugify";
import fs from "fs";

export const getInitialValuesFromFile = (filepath: string): [] => {
  try {
    // Check if the file exists
    if (fs.existsSync(filepath)) {
      const storedItemsBuffer = fs.readFileSync(filepath);
      return JSON.parse(storedItemsBuffer.toString());
    } else {
      fs.mkdirSync(environment.supportPath, { recursive: true });
      return []; // Return empty array if file doesn't exist
    }
  } catch (error) {
    fs.mkdirSync(environment.supportPath, { recursive: true });
    return [];
  }
};

export const exportNotes = async (filePath: string, notes: Note[]) => {
  if (!fs.existsSync(filePath) || !fs.lstatSync(filePath).isDirectory()) {
    showToast({ title: "Invalid Folder" });
    return;
  }

  await Promise.all(
    notes.map(async (note) => {
      const notePath = `${filePath}/${slugify(note.title)}.md`;
      const noteTitle = `# ${note.title}`;
      const noteTags = note.tags.length > 0 ? `Tags: ${note.tags.join(", ")}\n\n` : undefined;
      const noteBody = `${note.body}`;
      const completeNote = `${noteTitle}\n\n${noteTags ?? ""}${noteBody}`;
      await fs.promises.writeFile(notePath, completeNote);
    }),
  );
};

export const deleteNotesInFolder = (dirPath: string, filenames: string[]): Promise<void> => {
  if (!fs.existsSync(dirPath) || !fs.lstatSync(dirPath).isDirectory()) {
    return Promise.reject(`Invalid Folder: ${dirPath}`);
  }
  return new Promise<void>((resolve, reject) => {
    const deletionPromises = filenames.map((file) => {
      const filePath = `${dirPath}/${slugify(file)}.md`;
      return new Promise<void>((fileResolve, fileReject) => {
        fs.unlink(filePath, (err: NodeJS.ErrnoException | null) => {
          if (err) {
            fileReject(`Error deleting file ${filePath}: ${err}`);
          } else {
            fileResolve();
          }
        });
      });
    });

    Promise.all(deletionPromises)
      .then(() => resolve())
      .catch((err) => reject(err));
  });
};

export const getOldRenamedTitles = (oldNotes: Note[], newNotes: Note[]): string[] => {
  if (oldNotes.length === 0 || newNotes.length === 0) {
    return [];
  }
  const newNoteTitles = newNotes.map((note) => note.title);
  const oldNoteTitles = oldNotes.map((note) => note.title);
  return oldNoteTitles.filter((title) => !newNoteTitles.includes(title));
};

export const getDeletedNote = (oldNotes: Note[], newNotes: Note[]): Note | null => {
  if (oldNotes.length === 0 || oldNotes.length !== newNotes.length + 1) {
    return null;
  }
  return oldNotes.find((note) => !newNotes.includes(note)) || null;
};

export const getDeletedTags = (oldTags: Tag[], newTags: Tag[]): Tag[] => {
  return oldTags.filter((tag) => !newTags.includes(tag));
};

export const colors = [
  {
    name: "red",
    value: "0",
    tintColor: "hsl(0, 100%, 68%)",
  },
  {
    name: "orange",
    value: "18",
    tintColor: "hsl(18, 94%, 68%)",
  },
  {
    name: "amber",
    value: "42",
    tintColor: "hsl(42, 82%, 57%)",
  },
  {
    name: "yellow",
    value: "56",
    tintColor: "hsl(56, 73%, 45%)",
  },
  {
    name: "lime",
    value: "80",
    tintColor: "hsl(80, 79%, 43%)",
  },
  {
    name: "green",
    value: "152",
    tintColor: "hsl(152, 96%, 38%)",
  },
  {
    name: "turquoise",
    value: "180",
    tintColor: "hsl(180, 100%, 39%)",
  },
  {
    name: "sky",
    value: "198",
    tintColor: "hsl(198, 100%, 50%)",
  },
  {
    name: "blue",
    value: "220",
    tintColor: "hsl(220, 100%, 64%)",
  },
  {
    name: "indigo",
    value: "252",
    tintColor: "hsl(252, 100%, 67%)",
  },
  {
    name: "purple",
    value: "270",
    tintColor: "hsl(270, 100%, 65%)",
  },
  {
    name: "pink",
    value: "320",
    tintColor: "hsl(320, 100%, 59%)",
  },
];

export const getRandomColor = () => {
  return colors[Math.floor(Math.random() * colors.length)];
};
