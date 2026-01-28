import { getPreferenceValues } from "@raycast/api";
import fetch, { RequestInit } from "node-fetch";
import {
  MyMindResponseWithSlugs,
  Preferences,
  MyMindResponseSchema,
  ProseContent,
  ListItem,
  CreateNoteResponse,
  CreateNoteResponseSchema,
  CreateNotePayload,
} from "./schemas";

export async function fetchMyMindCards(): Promise<MyMindResponseWithSlugs> {
  // Get securely stored credentials from preferences
  const { jwt, cid, authenticityToken } = getPreferenceValues<Preferences>();

  const myHeaders = {
    "x-authenticity-token": authenticityToken,
    cookie: `_cid=${cid}; _jwt=${jwt}`,
  };

  const requestOptions: RequestInit = {
    method: "GET",
    headers: myHeaders,
    // Disable automatic redirect following
    redirect: "manual",
  };

  try {
    const response = await fetch("https://access.mymind.com/cards.json", requestOptions);

    if (!response.ok) {
      // Handle specific HTTP status codes
      if (response.status === 401 || response.status === 403 || response.status === 302) {
        throw new Error("Unauthorized: Your authentication token may have expired");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // First validate with original schema
    const validatedData = MyMindResponseSchema.parse(data);

    // Then add slugs to the validated data
    return Object.entries(validatedData).reduce((acc, [slug, card]) => {
      acc[slug] = { ...card, slug };
      return acc;
    }, {} as MyMindResponseWithSlugs);
  } catch (error) {
    // Check for redirect error specifically
    if (error instanceof Error && error.message.includes("maximum redirect")) {
      throw new Error("Unauthorized: Your authentication token may have expired");
    }

    // Other error handling
    if (error instanceof Error) {
      console.error("Error fetching MyMind cards:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    } else {
      console.error("Unknown error fetching MyMind cards:", error);
    }
    throw error;
  }
}

// Update the proseToMarkdown function
export function proseToMarkdown(content: ProseContent[]): string {
  if (!content || !Array.isArray(content)) return "";

  return content
    .map((node) => {
      if (!node) return "";

      switch (node.type) {
        case "heading": {
          const level = (node.attrs?.level as number) || 1;
          const headingText = node.content?.map((c) => c?.text || "").join("") || "";
          return "#".repeat(level) + " " + headingText + "\n\n";
        }

        case "paragraph": {
          if (!node.content) return "\n\n";
          const paragraphText = node.content
            .map((c) => {
              if (!c) return "";
              let text = c.text || "";

              // Apply marks
              if (c.marks) {
                for (const mark of c.marks) {
                  switch (mark.type) {
                    case "bold":
                      text = `**${text}**`;
                      break;
                    case "italic":
                      text = `*${text}*`;
                      break;
                    case "highlight":
                      text = `==${text}==`;
                      break;
                    case "strike":
                      text = `~~${text}~~`;
                      break;
                    case "code":
                      text = `\`${text}\``;
                      break;
                  }
                }
              }
              return text;
            })
            .join("");
          return paragraphText + "\n\n";
        }

        case "orderedList": {
          if (!node.content) return "";
          const startIndex = (node.attrs?.start as number) || 1;
          let listIndex = startIndex;
          return (
            node.content
              .map((item: ListItem) => {
                if (!item?.content) return "";
                const listItemContent = item.content
                  .map((content) => {
                    if (!content) return "";
                    if (content.type === "paragraph") {
                      return content.content?.map((c) => c?.text || "").join("") || "";
                    }
                    return "";
                  })
                  .join("\n");

                return `${listIndex++}. ${listItemContent}\n`;
              })
              .join("") + "\n"
          );
        }

        case "taskList": {
          if (!node.content) return "";
          return (
            node.content
              .map((item: ListItem) => {
                if (!item?.content) return "";
                const checked = item.attrs?.checked ? "x" : " ";
                const taskContent = item.content
                  .map((content) => {
                    if (content.type === "paragraph") {
                      return content.content?.map((c) => c?.text || "").join("") || "";
                    }
                    return "";
                  })
                  .join("");
                return `- [${checked}] ${taskContent}\n`;
              })
              .join("") + "\n"
          );
        }

        case "codeBlock": {
          const language = (node.attrs?.language as string) || "";
          const code = node.content?.map((c) => c?.text || "").join("") || "";
          return "```" + language + "\n" + code + "\n```\n\n";
        }

        case "horizontalRule":
          return "---\n\n";

        default:
          return "";
      }
    })
    .join("");
}

export async function deleteMyMindCard(slug: string): Promise<void> {
  // Get securely stored credentials from preferences
  const { jwt, cid, authenticityToken } = getPreferenceValues<Preferences>();

  const myHeaders = {
    "x-authenticity-token": authenticityToken,
    cookie: `_cid=${cid}; _jwt=${jwt}`,
  };

  try {
    const response = await fetch(`https://access.mymind.com/objects/${slug}`, {
      method: "DELETE",
      headers: myHeaders,
      redirect: "manual",
    });

    if (!response.ok) {
      // Handle specific HTTP status codes
      if (response.status === 401 || response.status === 403 || response.status === 302) {
        throw new Error("Unauthorized: Your authentication token may have expired");
      }
      throw new Error(`Failed to delete card: ${response.statusText}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("maximum redirect")) {
      throw new Error("Unauthorized: Your authentication token may have expired");
    }
    throw error;
  }
}

export async function createMyMindNote(markdown: string, title: string = ""): Promise<CreateNoteResponse> {
  const { jwt, cid, authenticityToken } = getPreferenceValues<Preferences>();

  const payload: CreateNotePayload = {
    title,
    prose: {
      type: "doc",
      content: markdownToProse(markdown),
    },
    type: "Note",
  };

  const myHeaders = {
    "x-authenticity-token": authenticityToken,
    cookie: `_cid=${cid}; _jwt=${jwt}`,
    "Content-Type": "application/json",
  };

  const response = await fetch("https://access.mymind.com/objects", {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify(payload),
    redirect: "manual",
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403 || response.status === 302) {
      throw new Error("Unauthorized: Your authentication token may have expired");
    }
    throw new Error(`Failed to create note: ${response.statusText}`);
  }

  const data = await response.json();
  return CreateNoteResponseSchema.parse(data);
}

function markdownToProse(markdown: string): ProseContent[] {
  const lines = markdown.split("\n");
  const content: ProseContent[] = [];
  let currentList: ProseContent[] = [];
  let isInCodeBlock = false;
  let codeBlockContent = "";
  let codeBlockLanguage = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.startsWith("```")) {
      if (!isInCodeBlock) {
        isInCodeBlock = true;
        codeBlockLanguage = line.slice(3).trim();
        codeBlockContent = "";
      } else {
        content.push({
          type: "codeBlock",
          attrs: { language: codeBlockLanguage },
          content: [{ type: "text", text: codeBlockContent.trim() }],
        });
        isInCodeBlock = false;
      }
      continue;
    }

    if (isInCodeBlock) {
      codeBlockContent += line + "\n";
      continue;
    }

    // Handle headings
    const headingMatch = line.match(/^(#{1,6})\s(.+)/);
    if (headingMatch) {
      content.push({
        type: "heading",
        attrs: { level: headingMatch[1].length },
        content: [{ type: "text", text: headingMatch[2] }],
      });
      continue;
    }

    // Handle task lists
    const taskMatch = line.match(/^- \[(x| )\] (.+)/);
    if (taskMatch) {
      if (currentList.length === 0 || currentList[0].type !== "taskList") {
        if (currentList.length > 0) {
          content.push({ type: "taskList", content: currentList });
          currentList = [];
        }
      }
      currentList.push({
        type: "taskItem",
        attrs: { checked: taskMatch[1] === "x" },
        content: [{ type: "paragraph", content: [{ type: "text", text: taskMatch[2] }] }],
      });
      continue;
    }

    // Handle horizontal rule
    if (line.match(/^-{3,}$/)) {
      content.push({ type: "horizontalRule" });
      continue;
    }

    // Handle regular paragraphs with inline formatting
    if (line.trim()) {
      const paragraph = {
        type: "paragraph",
        content: parseInlineFormatting(line),
      };
      content.push(paragraph);
    } else if (currentList.length > 0) {
      // End of a list
      content.push({ type: currentList[0].type === "taskItem" ? "taskList" : "orderedList", content: currentList });
      currentList = [];
    } else {
      // Empty line
      content.push({ type: "paragraph" });
    }
  }

  // Add any remaining list
  if (currentList.length > 0) {
    content.push({ type: currentList[0].type === "taskItem" ? "taskList" : "orderedList", content: currentList });
  }

  return content;
}

function parseInlineFormatting(text: string): ProseContent[] {
  const content: ProseContent[] = [];
  let currentText = "";
  let marks: { type: string }[] = [];

  // Helper function to add accumulated text with current marks
  const addText = () => {
    if (currentText) {
      content.push({ type: "text", text: currentText, ...(marks.length && { marks }) });
      currentText = "";
    }
  };

  for (let i = 0; i < text.length; i++) {
    // Handle bold
    if (text.slice(i, i + 2) === "**") {
      addText();
      marks = marks.some((m) => m.type === "bold")
        ? marks.filter((m) => m.type !== "bold")
        : [...marks, { type: "bold" }];
      i++;
      continue;
    }

    // Handle italic
    if (text[i] === "*") {
      addText();
      marks = marks.some((m) => m.type === "italic")
        ? marks.filter((m) => m.type !== "italic")
        : [...marks, { type: "italic" }];
      continue;
    }

    // Handle highlight
    if (text.slice(i, i + 2) === "==") {
      addText();
      marks = marks.some((m) => m.type === "highlight")
        ? marks.filter((m) => m.type !== "highlight")
        : [...marks, { type: "highlight" }];
      i++;
      continue;
    }

    // Handle strikethrough
    if (text.slice(i, i + 2) === "~~") {
      addText();
      marks = marks.some((m) => m.type === "strike")
        ? marks.filter((m) => m.type !== "strike")
        : [...marks, { type: "strike" }];
      i++;
      continue;
    }

    // Handle inline code
    if (text[i] === "`") {
      addText();
      marks = marks.some((m) => m.type === "code")
        ? marks.filter((m) => m.type !== "code")
        : [...marks, { type: "code" }];
      continue;
    }

    currentText += text[i];
  }

  addText(); // Add any remaining text
  return content;
}
export async function addTagToCard(slug: string, tagName: string): Promise<void> {
  const { jwt, cid, authenticityToken } = getPreferenceValues<Preferences>();

  const myHeaders = {
    "x-authenticity-token": authenticityToken,
    cookie: `_cid=${cid}; _jwt=${jwt}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(`https://access.mymind.com/objects/${slug}/tags`, {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify({ name: tagName }),
    redirect: "manual",
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403 || response.status === 302) {
      throw new Error("Unauthorized: Your authentication token may have expired");
    }
    throw new Error(`Failed to add tag: ${response.statusText}`);
  }
}
