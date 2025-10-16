import { environment, showToast, trash } from "@raycast/api";
import { Note, Sort, Tag } from "../services/atoms";
import slugify from "slugify";
import fs from "fs";
import { TODO_FILE_PATH } from "../services/config";
import { marked } from "marked";
import striptags from "striptags";

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

export const getSortHumanReadable = (sort: Sort): string => {
  switch (sort) {
    case "created":
      return "Created At";
    case "updated":
      return "Updated At";
    case "alphabetical":
      return "Alphabetical";
    case "tags":
      return "Tags";
  }
};

export const getSyncWithDirectory = async (dirPath?: string): Promise<Note[]> => {
  if (!dirPath) {
    return Promise.reject("No directory path");
  }
  if (!fs.existsSync(dirPath) || !fs.lstatSync(dirPath).isDirectory()) {
    return Promise.reject(`Invalid Folder: ${dirPath}`);
  }
  return new Promise<Note[]>((resolve, reject) => {
    const notes = getInitialValuesFromFile(TODO_FILE_PATH) as Note[];
    fs.readdir(dirPath, (err: NodeJS.ErrnoException | null, files: string[]) => {
      if (err) {
        reject(`Error reading directory: ${dirPath}`);
      } else {
        // Filter out non-Markdown files
        const markdownFiles = files.filter((file) => file.endsWith(".md"));

        // add markdown files to Notes
        const filePromises = markdownFiles.map((file) => {
          const notePath = `${dirPath}/${file}`;
          return new Promise<Note>((resolve, reject) => {
            fs.readFile(notePath, (err: NodeJS.ErrnoException | null, data: Buffer) => {
              if (err) {
                reject(`Error reading file: ${file}`);
              } else {
                // if it's an existing note, only update the body
                const existingNote = notes.find((note) => slugify(note.title) === file.split(".md")[0]);
                if (existingNote) {
                  existingNote.body = data.toString();
                  resolve(existingNote);
                  return;
                }

                // new note
                const body = data.toString();
                const title = file.split(".md")[0];
                const createdAt = fs.statSync(notePath).birthtime;
                const updatedAt = fs.statSync(notePath).mtime;
                const noteData: Note = {
                  title,
                  body,
                  tags: [],
                  is_draft: false,
                  createdAt: createdAt ?? new Date(),
                  updatedAt: updatedAt ?? new Date(),
                };
                resolve(noteData);
              }
            });
          });
        });
        Promise.all(filePromises)
          .then((noteData) => {
            const updatedNotes = noteData.map((note) => {
              const newNote = notes.find((n) => n.title === note.title);
              if (newNote) {
                return newNote;
              }
              return note;
            });

            resolve(updatedNotes);
          })
          .catch((error) => {
            reject(error);
          });
      }
    });
  });
};

export const exportNotes = async (filePath: string, notes: Note[]) => {
  if (!fs.existsSync(filePath) || !fs.lstatSync(filePath).isDirectory()) {
    showToast({ title: "Invalid Folder" });
    return;
  }

  await Promise.all(
    notes.map(async (note) => {
      const notePath = `${filePath}/${slugify(note.title)}.md`;
      const noteBody = `${note.body}`;
      await fs.promises.writeFile(notePath, noteBody);
    }),
  );
};

export const deleteNotesInFolder = async (dirPath: string, filenames: string[]): Promise<void> => {
  if (!fs.existsSync(dirPath) || !fs.lstatSync(dirPath).isDirectory()) {
    return Promise.reject(`Invalid Folder: ${dirPath}`);
  }
  await trash(filenames.map((file) => `${dirPath}/${slugify(file)}.md`));
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

export const setNoteSummary = (summary: string, createdAt?: Date) => {
  if (!createdAt) {
    return;
  }
  const notes = getInitialValuesFromFile(TODO_FILE_PATH) as Note[];
  const note = notes.find((n) => n.createdAt === createdAt);
  if (!note) {
    return;
  }

  const updatedNotes = notes.map((n) => (n.createdAt === createdAt ? { ...n, summary } : n));
  fs.writeFileSync(TODO_FILE_PATH, JSON.stringify(updatedNotes, null, 2));
};

export const clearNoteSummary = (createdAt?: Date) => {
  if (!createdAt) {
    return;
  }
  const notes = getInitialValuesFromFile(TODO_FILE_PATH) as Note[];
  const updatedNotes = notes.map((n) => (n.createdAt === createdAt ? { ...n, summary: undefined } : n));
  fs.writeFileSync(TODO_FILE_PATH, JSON.stringify(updatedNotes, null, 2));
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

export const getTintColor = (colorName?: string) => {
  if (!colorName) return undefined;
  return colors.find((c) => c.name === colorName)?.tintColor;
};

export const countWords = (markdownString: string): number => {
  const htmlString = marked.parse(markdownString, { async: false });
  const plainText = striptags(htmlString as string);
  const words = plainText
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((word) => word !== "");
  return words.length;
};
