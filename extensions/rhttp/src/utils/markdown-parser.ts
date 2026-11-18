interface HelpSection {
  title: string;
  items: HelpItem[];
}

interface HelpItem {
  title: string;
  content: string;
}

export function parseHelpMarkdown(markdown: string): HelpSection[] {
  // Split by # headings (sections)
  const sectionParts = markdown.split(/^# /m).filter(Boolean);

  return sectionParts.map((sectionText) => {
    const lines = sectionText.split("\n");
    const sectionTitle = lines[0].trim();

    // Split by ## headings (items)
    const itemParts = lines.slice(1).join("\n").split(/^## /m).filter(Boolean);

    const items: HelpItem[] = itemParts
      .map((itemText) => {
        const [title, ...contentLines] = itemText.split("\n");
        return {
          title: title.trim(),
          content: contentLines.join("\n").trim(),
        };
      })
      .filter((item) => item.title && item.content); // Filter out empty items

    return {
      title: sectionTitle,
      items,
    };
  });
}
