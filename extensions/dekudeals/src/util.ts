import { Deal } from "./networking";

export const getEntryURL = (entry: Deal): string => `https://www.dekudeals.com${entry.url}`;
