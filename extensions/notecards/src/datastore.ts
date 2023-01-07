import { Color, environment } from "@raycast/api";
export const CARDS_FILE = `${environment.supportPath}/cards.json`;
import fs from "fs";

export type Cards = Record<string, Card>;
type Card = {
  // TODO: Add more fields here for archive, sorting, etc
  body: string;
  color: string;
};
export const noteColors: Record<string, Color> = {
  Blue: Color.Blue,
  Green: Color.Green,
  Red: Color.Red,
  Yellow: Color.Yellow,
};
export const getNoteCards = (): Cards => {
  try {
    const storedItemsBuffer = fs.readFileSync(CARDS_FILE);
    return JSON.parse(storedItemsBuffer.toString()) as Cards;
  } catch (error) {
    fs.mkdirSync(environment.supportPath, { recursive: true });
  }
  return {};
};

export const storeNewCard = async (title: string, body: string, color: string) => {
  const currentCards = getNoteCards();
  fs.writeFileSync(
    CARDS_FILE,
    JSON.stringify({
      ...currentCards,
      [title]: { body: body, color: color },
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
