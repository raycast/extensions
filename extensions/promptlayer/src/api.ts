import { getPreferenceValues } from "@raycast/api";
import { PromptTemplate, PromptLayerResponse } from "./types";

interface Preferences {
  apiKey: string;
}

const PROMPTLAYER_API_BASE = "https://api.promptlayer.com";

/**
 * Fetch all prompt templates from PromptLayer
 */
export async function fetchPromptTemplates(): Promise<PromptTemplate[]> {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.apiKey;

  if (!apiKey) {
    throw new Error(
      "PromptLayer API key is required. Please set it in preferences.",
    );
  }

  try {
    const response = await fetch(`${PROMPTLAYER_API_BASE}/prompt-templates`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "Invalid API key. Please check your PromptLayer API key in preferences.",
        );
      }
      if (response.status === 403) {
        throw new Error(
          "Access denied. Please verify your PromptLayer API key has the correct permissions.",
        );
      }
      if (response.status === 404) {
        throw new Error(
          "API endpoint not found. Please check if your PromptLayer account has access to prompt templates.",
        );
      }
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch templates: ${response.status} ${response.statusText}. ${errorText}`,
      );
    }

    const data = (await response.json()) as PromptLayerResponse;
    if (!data.items || !Array.isArray(data.items)) {
      console.warn("No items array found in response:", data);
      return [];
    }

    // Transform PromptLayer format to our internal format
    const transformedTemplates: PromptTemplate[] = data.items.map((item) => {
      try {
        interface MessageContent {
          type: string;
          text?: string;
        }

        interface Message {
          content: string | MessageContent[];
        }

        // Extract text content from different possible structures
        let textContent = "";
        let inputVariables: string[] = [];

        // Try messages format first (direct on item)
        if (item.messages && Array.isArray(item.messages)) {
          textContent = item.messages
            .map((message: Message) => {
              if (message.content && Array.isArray(message.content)) {
                return message.content
                  .map((content: MessageContent) => {
                    if (content.type === "text" && content.text) {
                      return content.text;
                    }
                    return "";
                  })
                  .join(" ");
              } else if (typeof message.content === "string") {
                return message.content;
              }
              return "";
            })
            .join("\n");
        }
        // Try prompt_template.messages format
        else if (
          item.prompt_template?.messages &&
          Array.isArray(item.prompt_template.messages)
        ) {
          textContent = item.prompt_template.messages
            .map((message: Message) => {
              if (message.content && Array.isArray(message.content)) {
                return message.content
                  .map((content: MessageContent) => {
                    if (content.type === "text" && content.text) {
                      return content.text;
                    }
                    return "";
                  })
                  .join(" ");
              } else if (typeof message.content === "string") {
                return message.content;
              }
              return "";
            })
            .join("\n");
        }
        // Try prompt_template.content format
        else if (
          item.prompt_template?.content &&
          Array.isArray(item.prompt_template.content)
        ) {
          textContent = item.prompt_template.content
            .map((content) => content.text || "")
            .join(" ");
        }

        // Get input variables from different possible locations
        inputVariables =
          item.input_variables || item.prompt_template?.input_variables || [];

        return {
          ...item,
          name: item.prompt_name,
          template: textContent,
          tags: item.tags || [],
          input_variables: inputVariables,
        };
      } catch (error) {
        console.error("Error transforming template:", item, error);
        return {
          ...item,
          name: item.prompt_name || `Template ${item.id}`,
          template: "Error loading template content",
          tags: [],
          input_variables: [],
        };
      }
    });

    return transformedTemplates;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Network error: ${String(error)}`);
  }
}

/**
 * Search templates by name or content
 */
export function searchTemplates(
  templates: PromptTemplate[],
  query: string,
): PromptTemplate[] {
  if (!query.trim()) return templates;

  const searchTerm = query.toLowerCase();
  return templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchTerm) ||
      template.template.toLowerCase().includes(searchTerm) ||
      template.tags?.some((tag) => tag.toLowerCase().includes(searchTerm)) ||
      template.metadata?.description?.toLowerCase().includes(searchTerm),
  );
}

/**
 * Filter templates by tag
 */
export function filterByTag(
  templates: PromptTemplate[],
  tag: string,
): PromptTemplate[] {
  if (!tag) return templates;
  return templates.filter((template) =>
    template.tags?.some((t) => t.toLowerCase() === tag.toLowerCase()),
  );
}

/**
 * Get all unique tags from templates
 */
export function getAllTags(templates: PromptTemplate[]): string[] {
  const tags = new Set<string>();
  templates.forEach((template) => {
    template.tags?.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
}
