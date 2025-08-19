import TurndownService from "turndown";
const turndownService = new TurndownService();

export const convertToMarkdown = (str: string): string => turndownService.turndown(str);
