import { environment } from "@raycast/api";
export const CARDS_FILE = `${environment.supportPath}/cards.json`;
import fs from "fs";

export const getNoteCards = (): Record<string, string> => {
  try {
    const storedItemsBuffer = fs.readFileSync(CARDS_FILE);
    return JSON.parse(storedItemsBuffer.toString()) as Record<string, string>;
  } catch (error) {
    fs.mkdirSync(environment.supportPath, { recursive: true });
  }
  return {};
};

export const storeNewCard = async (title: string, body: string) => {
  const currentCards = getNoteCards();
  fs.writeFileSync(
    CARDS_FILE,
    JSON.stringify({
      [title]: body,
      ...currentCards,
    })
  );
  return true;
};

export const deleteCard = async (title: string) => {
  const currentCards = getNoteCards();
  delete currentCards[title];
  fs.writeFileSync(CARDS_FILE, JSON.stringify(currentCards));
  return true;
};
