import { AnnouncementContentObject } from "./types";

export function generateAnnouncementMarkdown(content: AnnouncementContentObject[]) {
    return content.map(c => {
        if (c.type==="announcement-title")
            return `# ${c.children[0].text || "<untitled>"}`
        else if (c.type==="image")
            return `<img src="${c.url}" alt="${c.alt}" />`;
        else
            return `${c.children[0].text}`
    }).join("\n\n");
}