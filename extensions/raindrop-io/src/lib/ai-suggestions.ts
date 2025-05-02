import { AI, environment, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { Collection } from "../types"; // Correct import path for Collection

// Basic URL Scraper (Placeholder - Needs Improvement for Robustness)
// Attempts to fetch basic metadata or fallback to partial body content
async function scrapeUrlContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, { headers: { "User-Agent": "RaycastAgent/1.0" } }); // Set a user-agent
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      // Handle non-HTML content if necessary, maybe return just the URL or a summary
      return `Non-HTML content type: ${contentType}`;
    }

    const text = await response.text();

    // Basic Metadata Extraction (Example)
    const titleMatch = text.match(/<title>(.*?)<\/title>/i);
    const descriptionMatch = text.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']\s*\/?>/i);
    const ogTitleMatch = text.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']\s*\/?>/i);
    const ogDescriptionMatch = text.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']\s*\/?>/i);

    let scrapedContent = `URL: ${url}\n`;
    if (ogTitleMatch?.[1] || titleMatch?.[1]) {
      scrapedContent += `Title: ${ogTitleMatch?.[1] || titleMatch?.[1]}\n`;
    }
    if (ogDescriptionMatch?.[1] || descriptionMatch?.[1]) {
      scrapedContent += `Description: ${ogDescriptionMatch?.[1] || descriptionMatch?.[1]}\n`;
    }

    // Fallback: Add a snippet of body text if metadata is sparse
    // This needs a more sophisticated parser in a real implementation (e.g., jsdom)
    const bodySnippetMatch = text.match(/<body.*?>(.*?)<\/body>/is);
    if (bodySnippetMatch?.[1]) {
      const plainText = bodySnippetMatch[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s\s+/g, " ")
        .trim();
      scrapedContent += `\nBody Snippet: ${plainText.substring(0, 500)}...`; // Limit length
    }

    return scrapedContent;
  } catch (error) {
    console.error("Error scraping URL:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Scrape URL",
      message: error instanceof Error ? error.message : String(error),
    });
    // Return URL itself or minimal info if scraping fails
    return `URL: ${url} (Scraping failed: ${error instanceof Error ? error.message : "Unknown error"})`;
  }
}

export interface AISuggestions {
  suggestedTags: string[];
  suggestedCollectionId: number | null;
}

// Function to get AI suggestions
export async function getAiSuggestions(
  url: string,
  existingTags: string[],
  existingCollections: Collection[],
): Promise<AISuggestions | null> {
  if (!environment.canAccess(AI)) {
    console.log("AI is not accessible.");
    return null;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Generating AI Suggestions...",
  });

  try {
    const scrapedContent = await scrapeUrlContent(url);

    const collectionsText = existingCollections.map((c) => `- ${c.title} (ID: ${c._id})`).join("\n");
    const tagsText = existingTags.join(", ");

    // Construct the prompt
    const prompt = `
Analyze the following web page content and suggest appropriate tags and a single collection ID based on the user's existing organization.

**Web Page Content:**
---
${scrapedContent}
---

**User's Existing Collections:**
---
${collectionsText}
---

**User's Existing Tags:**
---
[${tagsText}]
---

**Instructions:**
1. Suggest 1-3 relevant tags that best describe the **main subject matter** of the web page content, primarily considering the URL, Title, and Description.
2. **Strongly prefer** suggesting tags from the User's Existing Tags list *only if they accurately describe the main subject matter*. If no existing tags fit well, suggest new, relevant, lowercase tags capturing the core subject. **Ignore terms related to common web UI elements (like 'login', 'button', 'form', 'menu'), page structure, or standard website functionality unless they are the *primary topic* of the page itself.** New tags should be reasonably specific to the topic (e.g., 'chess', 'web development', 'cooking') but avoid excessive detail or temporary specifics (e.g., 'queen's gambit opening', 'navbar color', 'summer sale 2024').
3. Identify the *single* most relevant collection ID from the user's existing list that best reflects the **primary category or overall purpose** of the content (e.g., 'Games', 'Software Development', 'News Articles', 'Recipes'). Do not suggest a collection that isn't listed.
4. Respond *only* in JSON format with the following structure:
   {
     "suggestedTags": ["tag1", "tag2"],
     "suggestedCollectionId": <collection_id> 
   }
   If no suitable collection is found, use 'null' for suggestedCollectionId. Ensure the output is valid JSON.
`;

    console.log("Sending prompt to AI:", prompt); // For debugging

    const aiResponse = await AI.ask(prompt, {
      model: AI.Model.OpenAI_GPT4o, // Or choose another suitable model
    });

    console.log("Raw AI Response:", aiResponse); // For debugging

    // --- Response Parsing (Crucial & Error-Prone) ---
    const suggestions: { suggestedTags: string[]; suggestedCollectionId: number | null } = {
      suggestedTags: [],
      suggestedCollectionId: null,
    };
    try {
      // --- Clean the response ---
      // Remove markdown code fences (```json ... ``` or ``` ... ```)
      const cleanedResponse = aiResponse
        .trim()
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
      console.log("Cleaned AI Response:", cleanedResponse); // Debugging

      // Attempt to parse the CLEANED JSON response
      const parsed = JSON.parse(cleanedResponse);

      if (
        Array.isArray(parsed.suggestedTags) &&
        parsed.suggestedTags.every((t: string) => typeof t === "string" && t.trim().length > 0)
      ) {
        suggestions.suggestedTags = parsed.suggestedTags.map((t) => t.trim());
      }

      // Validate collection ID against existing collections
      const foundCollection = existingCollections.find((c) => c._id === parsed.suggestedCollectionId);
      if (foundCollection) {
        suggestions.suggestedCollectionId = foundCollection._id;
      } else if (parsed.suggestedCollectionId === null) {
        suggestions.suggestedCollectionId = null; // Explicitly allow null
      } else {
        console.warn("AI suggested a non-existent or invalid collection ID:", parsed.suggestedCollectionId);
        // Keep collectionId as null if invalid ID suggested
      }
    } catch (parseError) {
      console.error("Failed to parse AI JSON response:", parseError, "\nResponse was:", aiResponse); // Log original response on error
      toast.style = Toast.Style.Failure;
      toast.title = "AI Error";
      toast.message = "Failed to understand AI response format.";
      return null; // Indicate failure
    }
    // --- End Response Parsing ---

    toast.style = Toast.Style.Success;
    toast.title = "AI Suggestions Applied";
    toast.message = `Tags: ${suggestions.suggestedTags.join(", ") || "None"}, Collection ID: ${suggestions.suggestedCollectionId ?? "None"}`;

    return suggestions;
  } catch (error) {
    console.error("Error getting AI suggestions:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to Get AI Suggestions";
    toast.message = error instanceof Error ? error.message : String(error);
    return null; // Indicate failure
  }
}
