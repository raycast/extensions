import generatedData from "./generated.json";
import type { CheatsheetItem, GeneratedCheatsheetData } from "../types";

const data = generatedData as GeneratedCheatsheetData;

export const cheatsheetItems: CheatsheetItem[] = data.items;
