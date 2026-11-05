import type { Tool } from "@raycast/api";
import { parseTags } from "teak-sdk";
import {
  addCardToFolder,
  getCardById,
  listFolders,
  setCardArchived,
  setCardDone,
  updateCard,
} from "../lib/api";
import { parseToolCardId } from "../lib/apiParsers";
import { findManualFolder } from "../lib/folderLookup";
import {
  explainPaletteEdit,
  paletteHexes,
  parsePaletteHexList,
} from "../lib/paletteColors";

type Input = {
  /** The Teak card id to update. */
  cardId: string;
  /** Comma-separated tags to add to the card. */
  addTags?: string;
  /** Comma-separated tags to remove, including tags Teak added automatically. */
  removeTags?: string;
  /** Replacement notes. An empty string clears the notes. */
  notes?: string;
  /** Mark a link card done (true: read, watched, bought) or not done (false). Links only. */
  done?: boolean;
  /** Archive the card (true) or return it to the library (false). */
  archived?: boolean;
  /** Add the card to this manual folder: its name, or its id from list-folders. */
  addToFolder?: string;
  /** Palette cards only: comma-separated hex codes to add, such as "#FF5500, 2A9D8F". */
  addColors?: string;
  /** Palette cards only: comma-separated hex codes to remove. Removes apply before adds. */
  removeColors?: string;
};

const clean = (tags: string | undefined) => parseTags(tags) ?? [];

export default async function tool(input: Input) {
  const cardId = parseToolCardId(input.cardId);
  const addTags = clean(input.addTags).map((tag) => tag.toLowerCase());
  const removeTags = clean(input.removeTags).map((tag) => tag.toLowerCase());
  const isRemoved = (tag: string) => removeTags.includes(tag.toLowerCase());
  const changesTagsOrNotes =
    addTags.length > 0 || removeTags.length > 0 || input.notes !== undefined;
  const colorsToAdd = parsePaletteHexList(input.addColors);
  const colorsToRemove = parsePaletteHexList(input.removeColors);
  const changesColors =
    colorsToAdd.hexes.length + colorsToAdd.invalid.length > 0 ||
    colorsToRemove.hexes.length + colorsToRemove.invalid.length > 0;
  if (
    !(
      changesTagsOrNotes ||
      changesColors ||
      input.done !== undefined ||
      input.archived !== undefined ||
      input.addToFolder?.trim()
    )
  ) {
    throw new Error(
      "Provide tags to add or remove, new notes, colors, done, archived, or a folder",
    );
  }

  let card = await getCardById(cardId, "silent");
  // Checked before anything changes, so a refusal leaves the card as it was.
  if (input.done !== undefined && card.type !== "link") {
    throw new Error("Only link cards can be marked done.");
  }
  if (changesColors) {
    if (card.type !== "palette") {
      throw new Error("Only palette cards have colors you can change.");
    }
    const problem = explainPaletteEdit(paletteHexes(card.colors), {
      add: colorsToAdd.hexes,
      invalid: [...colorsToRemove.invalid, ...colorsToAdd.invalid],
      remove: colorsToRemove.hexes,
    });
    if (problem) {
      throw new Error(problem);
    }
  }
  const folder = input.addToFolder?.trim()
    ? findManualFolder((await listFolders("silent")).items, input.addToFolder)
    : null;

  // Tags, notes and colors go in one request, so they save or fail together.
  if (changesTagsOrNotes || changesColors) {
    const tags = Array.from(new Set([...card.tags, ...addTags])).filter(
      (tag) => !isRemoved(tag),
    );
    const removeAiTags = card.aiTags.filter(isRemoved);
    card = await updateCard(
      cardId,
      {
        ...(changesTagsOrNotes ? { tags } : {}),
        ...(removeAiTags.length > 0 ? { removeAiTags } : {}),
        ...(input.notes === undefined
          ? {}
          : { notes: input.notes.trim() ? input.notes.trim() : null }),
        ...(colorsToRemove.hexes.length > 0
          ? { removeColors: colorsToRemove.hexes }
          : {}),
        ...(colorsToAdd.hexes.length > 0
          ? { addColors: colorsToAdd.hexes }
          : {}),
      },
      "silent",
    );
  }
  if (input.done !== undefined) {
    card = await setCardDone(cardId, input.done, "silent");
  }
  if (input.archived !== undefined) {
    card = await setCardArchived(cardId, input.archived, "silent");
  }
  if (folder) {
    const result = await addCardToFolder(folder.id, cardId, "silent");
    if (result.updatedIds.length === 0 && result.failedIds.length > 0) {
      throw new Error(
        result.folderLimitIds.length > 0
          ? "That card is already in the most folders a card can be in."
          : "Teak couldn't add the card to the folder.",
      );
    }
  }

  return {
    aiTags: card.aiTags,
    appUrl: card.appUrl,
    cardId: card.id,
    ...(card.type === "palette" ? { colors: paletteHexes(card.colors) } : {}),
    isArchived: Boolean(card.isArchived),
    isDone: typeof card.completedAt === "number",
    ...(folder ? { addedToFolder: folder.name } : {}),
    notes: card.notes,
    tags: card.tags,
  };
}

export const confirmation: Tool.Confirmation<Input> = (input) => {
  const info: { name: string; value: string }[] = [
    { name: "Card ID", value: input.cardId },
  ];
  if (clean(input.addTags).length) {
    info.push({ name: "Add Tags", value: clean(input.addTags).join(", ") });
  }
  if (clean(input.removeTags).length) {
    info.push({
      name: "Remove Tags",
      value: clean(input.removeTags).join(", "),
    });
  }
  if (input.notes !== undefined) {
    info.push({ name: "Notes", value: input.notes || "(clear)" });
  }
  for (const [name, value] of [
    ["Add Colors", input.addColors],
    ["Remove Colors", input.removeColors],
  ] as const) {
    const { hexes } = parsePaletteHexList(value);
    if (hexes.length > 0) {
      info.push({ name, value: hexes.join(", ") });
    }
  }
  if (input.done !== undefined) {
    info.push({
      name: "Done",
      value: input.done ? "Mark done" : "Mark not done",
    });
  }
  if (input.archived !== undefined) {
    info.push({
      name: "Archive",
      value: input.archived ? "Archive" : "Unarchive",
    });
  }
  if (input.addToFolder?.trim()) {
    info.push({ name: "Add to Folder", value: input.addToFolder.trim() });
  }
  return Promise.resolve({ info, message: "Update this Teak card?" });
};
