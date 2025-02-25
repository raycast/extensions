import os from "os";

export const fileIcon = "/System/Applications/Notes.app";

export function escapeDoubleQuotes(value: string) {
  return value.replace(/"/g, '\\"');
}

export function truncate(str: string, maxLength = 30): string {
  if (str.length <= maxLength) {
    return str;
  }

  return str.substring(0, maxLength) + "…";
}

export function getOpenNoteURL(uuid: string) {
  const isSonomaOrLater = parseInt(os.release().split(".")[0]) >= 23;
  return `${isSonomaOrLater ? "applenotes" : "notes"}://showNote?identifier=${uuid}`;
}

/**
 * Converts a plain text note into formatted HTML, supporting paragraphs and nested lists.
 *
 * - Lines starting with `-`, `*`, `•`, or `number.` are treated as list items.
 * - Lists are automatically nested based on indentation (assumes 4 spaces per level).
 * - Regular text is wrapped in `<p>` tags.
 * - Empty lines are converted to `<br>` for spacing.
 * - Ensures proper opening/closing of list tags to maintain valid HTML.
 */
export function fixNoteFormatting(title: string, body?: string) {
  const lines = body?.split(/\r?\n/) || [];
  let formattedText = "";
  let openLists = 0;
  let prevIndent = 0;
  let currentListType = "ul";
  let previousLineWasList = false;

  /**
   * Closes any open lists when transitioning to non-list content or reducing indentation.
   * Ensures proper HTML structure by balancing opened and closed tags.
   */
  function closeOpenLists(indentLevel: number) {
    if (openLists > 0) {
      formattedText += `</${currentListType}>`.repeat(openLists);
      openLists = 0;
      prevIndent = indentLevel;
    }
  }

  /**
   * Processes a single line of text, determining if it's part of a list or plain text.
   * Handles indentation-based list nesting and properly formats the output.
   */
  function formatLine(line: string) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      if (previousLineWasList) closeOpenLists(0);
      formattedText += "<br>";
      previousLineWasList = false;
      return;
    }

    const match = line.match(/^(\s*)([-•*]|\d+\.)?\s*(.+)/);
    if (!match) return;

    const [, spaces, listMarker, text] = match;
    const indentLevel = Math.floor(spaces.length / 4);
    const isListItem = !!listMarker;

    if (isListItem) {
      const isOrdered = /^\d+\./.test(listMarker!);
      const listTag = isOrdered ? "ol" : "ul";

      if (openLists === 0) {
        formattedText += `<${listTag}>`;
        openLists++;
      } else if (indentLevel > prevIndent) {
        formattedText += `<${listTag}>`.repeat(indentLevel - prevIndent);
        openLists += indentLevel - prevIndent;
      } else if (indentLevel < prevIndent) {
        formattedText += `</${currentListType}>`.repeat(prevIndent - indentLevel);
        openLists -= prevIndent - indentLevel;
      }

      formattedText += `<li>${text.trim()}</li>`;
      prevIndent = indentLevel;
      currentListType = listTag;
      previousLineWasList = true;
    } else {
      closeOpenLists(indentLevel);
      formattedText += `<p>${trimmedLine}</p>`;
      previousLineWasList = false;
    }
  }

  lines.forEach(formatLine);
  closeOpenLists(0);

  return {
    noteInHtmlFormat: `<h1>${title}</h1><div style=\\"font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;\\">${formattedText}</div>`,
    noteTitleInHtmlFormat: `<h1>${title}</h1>`,
    noteTextInHtmlFormat: `<div style=\\"font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;\\">${formattedText}</div>`,
  };
}
