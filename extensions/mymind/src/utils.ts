import { getPreferenceValues } from "@raycast/api";
import { z } from "zod";
import fetch, { RequestInit } from "node-fetch";

interface Preferences {
  cookie: string;
  cid: string;
  authenticityToken: string;
}

// Define the schemas
const TagSchema = z.object({
  type: z.string(),
  content: z.string(),
});

const SourceSchema = z.object({
  url: z.string(),
});

const ProseContentSchema = z
  .object({
    type: z.string(),
    content: z.array(z.any()).optional(),
    text: z.string().optional(),
    attrs: z.record(z.any()).optional(),
    marks: z.array(z.object({ type: z.string() })).optional(),
  })
  .or(
    z.object({
      type: z.string(),
      text: z.string(),
    }),
  );

const ProseSchema = z.object({
  type: z.string(),
  content: z.array(ProseContentSchema),
});

const NoteSchema = z.object({
  id: z.string(),
  prose: ProseSchema,
});

const CardSchema = z.object({
  title: z.string().optional(),
  siteName: z.string().optional(),
  domain: z.string().optional(),
  description: z.string().optional(),
  source: SourceSchema.optional(),
  tags: z.array(TagSchema).optional(),
  modified: z.string(),
  bumped: z.string(),
  created: z.string(),
  prose: ProseSchema.optional(),
  note: NoteSchema.optional(),
  brand: z.string().optional(),
  ocr: z.string().optional(),
});

const MyMindResponseSchema = z.record(CardSchema);

// Add this type after the MyMindResponseSchema definition
export type CardWithSlug = z.infer<typeof CardSchema> & { slug: string };
type MyMindResponseWithSlugs = Record<string, CardWithSlug>;

export async function fetchMyMindCards(): Promise<MyMindResponseWithSlugs> {
  // Get securely stored credentials from preferences
  const { cookie, cid, authenticityToken } = getPreferenceValues<Preferences>();

  const myHeaders = {
    "x-authenticity-token": authenticityToken,
    cookie: `_cid=${cid}; _jwt=${cookie}`,
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

// Add this new function to convert prose content to markdown
export function proseToMarkdown(content: any[] | undefined): string {
  if (!content || !Array.isArray(content)) return "";

  return content
    .map((node) => {
      if (!node) return "";

      switch (node.type) {
        case "heading":
          const level = node.attrs?.level || 1;
          const headingText = node.content?.map((c: any) => c?.text || "").join("") || "";
          return "#".repeat(level) + " " + headingText + "\n\n";

        case "paragraph":
          if (!node.content) return "\n\n";
          const paragraphText = node.content
            .map((c: any) => {
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

        case "orderedList":
          if (!node.content) return "";
          let listIndex = node.attrs?.start || 1;
          return (
            node.content
              .map((item: any) => {
                if (!item?.content) return "";
                const listItemContent = item.content
                  .map((content: any) => {
                    if (!content) return "";
                    if (content.type === "paragraph") {
                      return content.content?.map((c: any) => c?.text || "").join("") || "";
                    }
                    return "";
                  })
                  .join("\n");

                return `${listIndex++}. ${listItemContent}\n`;
              })
              .join("") + "\n"
          );

        case "taskList":
          if (!node.content) return "";
          return (
            node.content
              .map((item: any) => {
                if (!item?.content) return "";
                const checked = item.attrs?.checked ? "x" : " ";
                const taskContent = item.content
                  .map((content: any) => {
                    if (content.type === "paragraph") {
                      return content.content?.map((c: any) => c?.text || "").join("") || "";
                    }
                    return "";
                  })
                  .join("");
                return `- [${checked}] ${taskContent}\n`;
              })
              .join("") + "\n"
          );

        case "codeBlock":
          const language = node.attrs?.language || "";
          const code = node.content?.map((c: any) => c?.text || "").join("") || "";
          return "```" + language + "\n" + code + "\n```\n\n";

        case "horizontalRule":
          return "---\n\n";

        default:
          return "";
      }
    })
    .join("");
}
