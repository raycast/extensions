import TurndownService from "turndown";
import { SublimeCard } from "./types";

const turndownService = new TurndownService();

export type SublimeCardWithMarkdown = SublimeCard & { markdown: string };
export function populateCardMarkdown(card: SublimeCard): SublimeCardWithMarkdown {
    return {
        ...card,
        markdown: htmlToMarkdown(card.html || card.text || card.description || ""),
    };
}

export function htmlToMarkdown(html: string) {
    return turndownService.turndown(html);
}
