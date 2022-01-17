import TurndownService from "turndown";

const turndownService = new TurndownService();

turndownService.remove("link");
turndownService.remove("style");
turndownService.remove("img");

turndownService.addRule("initalSections", {
  filter: (node) => {
    return node.nodeName === "SECTION" && !!node.getAttribute("id")?.includes("mf-section-0");
  },
  replacement: () => "",
});

turndownService.addRule("linkedImages", {
  filter: (node) => {
    return node.firstChild?.nodeName === "IMG";
  },
  replacement: () => "",
});

turndownService.addRule("referenceLinks", {
  filter: (node) => {
    return (
      node.nodeName === "SPAN" &&
      node.className.includes("reference-text") &&
      Array.from(node.children || []).some((child) => child.nodeName === "UL")
    );
  },
  replacement: () => "",
});

turndownService.addRule("citeNotes", {
  filter: (node) => {
    return node.nodeName === "A" && !!node.getAttribute("href")?.includes("#cite_note");
  },
  replacement: () => "",
});

turndownService.addRule("citeReferences", {
  filter: (node) => {
    return (
      (node.nodeName === "SPAN" && node.className.includes("cite-backlink")) ||
      !!(node.nodeName === "A" && node.getAttribute("href")?.includes("#cite_ref"))
    );
  },
  replacement: () => "",
});

turndownService.addRule("trimListItems", {
  filter: ["li"],
  replacement(content, node) {
    if (node && node.parentNode) {
      if (content.trim() === "") {
        return "";
      }
      if (node.parentNode.nodeName === "UL") {
        return `- ${content.trim()}\n`;
      }
      return `1. ${content.trim()}\n`;
    }
    return "";
  },
});

turndownService.addRule("thumbnails", {
  filter: (node) => {
    return node.nodeName === "DIV" && node.className.includes("thumbinner");
  },
  replacement: () => "",
});

turndownService.addRule("internalLinks", {
  filter: (node) => {
    return node.nodeName === "A" && !!node.getAttribute("href")?.startsWith("/");
  },
  replacement: (content, node) => {
    const href = (node as HTMLElement).getAttribute("href");
    return `[${content}](https://wikipedia.com${href})`;
  },
});

export default function markdownWikipediaPage(html: string): string {
  return turndownService.turndown(html);
}
