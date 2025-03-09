import { getDefaultMacFirefoxBookmarksPath } from "../readthem";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execSync } from "child_process";
import { AI, environment } from "@raycast/api";

interface BookmarkItem {
  id: number;
  title: string;
  url: string;
  dateAdded: number;
}

type Input = {
  /**
   * The query for bookmarks (can be natural language like "show me bookmarks from last week")
   */
  query?: string;
};

function cleanAIResponse(response: string): string {
  // Remove any markdown code block indicators and whitespace
  return response.replace(/```[a-z]*\n?|\n```/g, "").trim();
}

async function processNaturalLanguageQuery(query: string, bookmarks: BookmarkItem[]): Promise<BookmarkItem[]> {
  if (!environment.canAccess(AI)) {
    return bookmarks; // Return all bookmarks if AI is not available
  }

  try {
    // Ask AI to interpret the temporal query and return a date range
    const aiResponse = await AI.ask(
      `You are a JSON generator. Given this query about bookmarks: "${query}"
If it contains temporal information (e.g., "last week", "this month", etc.), output ONLY a JSON object in this exact format:
{"startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "isTemporalQuery": true}

If it doesn't contain temporal information, output ONLY a JSON object in this exact format:
{"isTemporalQuery": false}

Do not include any other text, markdown formatting, or explanation. Output only the JSON object.`,
      {
        model: AI.Model["OpenAI_GPT4o-mini"],
        creativity: "none", // Use none since we want exact format
      },
    );

    const cleanResponse = cleanAIResponse(aiResponse);
    console.log("Cleaned temporal response:", cleanResponse);
    const dateRange = JSON.parse(cleanResponse);

    if (!dateRange.isTemporalQuery) {
      // If it's not a temporal query, try to use AI to filter based on content
      const contentFilter = await AI.ask(
        `You are a JSON generator. Given these bookmarks:
${JSON.stringify(bookmarks)}

Filter and rank them based on this query: "${query}"
Output ONLY an array of bookmark IDs that match, ordered by relevance.
Example output: [123, 456, 789]

Do not include any other text, markdown formatting, or explanation. Output only the JSON array.`,
        {
          model: AI.Model["OpenAI_GPT4o-mini"],
          creativity: "low",
        },
      );

      const cleanContentResponse = cleanAIResponse(contentFilter);
      console.log("Cleaned content response:", cleanContentResponse);
      const relevantIds = JSON.parse(cleanContentResponse) as number[];
      return bookmarks.filter((bm) => relevantIds.includes(bm.id));
    }

    // Filter bookmarks by date range
    const startDate = new Date(dateRange.startDate).getTime();
    const endDate = new Date(dateRange.endDate).getTime();

    return bookmarks.filter((bm) => {
      const bookmarkDate = bm.dateAdded;
      return bookmarkDate >= startDate && bookmarkDate <= endDate;
    });
  } catch (error) {
    console.error("AI processing error:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
    return bookmarks; // Return all bookmarks if AI processing fails
  }
}

async function readBookmarksFromDb(dbPath: string): Promise<string> {
  try {
    // First, try to dump just the tables we need
    const output = execSync(
      `/usr/bin/sqlite3 "${dbPath}" ".mode json" ".headers on" "SELECT b.id, b.title, p.url, b.dateAdded FROM moz_bookmarks b LEFT JOIN moz_places p ON b.fk = p.id WHERE b.type = 1 AND b.title IS NOT NULL AND b.title != '' ORDER BY b.dateAdded DESC LIMIT 100;"`,
      {
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      },
    );

    if (!output) {
      return "No bookmarks found";
    }

    const rows = JSON.parse(output) as BookmarkItem[];

    if (rows.length === 0) {
      return "No bookmarks found";
    }

    return JSON.stringify(rows);
  } catch (error) {
    console.error("Error reading database:", error);
    throw error;
  }
}

function formatBookmarksAsMarkdown(bookmarks: BookmarkItem[]): string {
  const markdownContent = bookmarks.map((bm, index) => {
    const safeName = (bm.title || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
    const safeURL = (bm.url || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
    return `| ${index + 1} | ${new Date(bm.dateAdded / 1000).toISOString()} | ${safeName} | ${safeURL} |`;
  });

  return ["| # | Date Added | Title | URL |", "|---|------------|-------|-----|", ...markdownContent].join("\n");
}

export default async function tool(input: Input): Promise<string> {
  console.log(input);
  const dbPath = getDefaultMacFirefoxBookmarksPath();

  try {
    // Try to read directly
    const bookmarksJson = await readBookmarksFromDb(dbPath);
    let bookmarks = JSON.parse(bookmarksJson) as BookmarkItem[];

    // If there's a query, process it with AI
    if (input.query) {
      bookmarks = await processNaturalLanguageQuery(input.query, bookmarks);
    }

    return formatBookmarksAsMarkdown(bookmarks);
  } catch (error) {
    console.log("Initial read attempt failed:", error);

    // If we get a database locked error, try with a different approach
    if (
      error instanceof Error &&
      (error.message.includes("database is locked") || error.message.includes("unable to open database"))
    ) {
      try {
        // Create a temporary file for the JSON output
        const tmpDir = os.tmpdir();
        const tmpFile = path.join(tmpDir, `bookmarks-${Date.now()}.json`);

        // Try to dump the data we need directly to JSON
        execSync(
          `/usr/bin/sqlite3 "${dbPath}" ".mode json" ".output ${tmpFile}" "SELECT b.id, b.title, p.url, b.dateAdded FROM moz_bookmarks b LEFT JOIN moz_places p ON b.fk = p.id WHERE b.type = 1 AND b.title IS NOT NULL AND b.title != '' ORDER BY b.dateAdded DESC LIMIT 100;"`,
          { encoding: "utf8" },
        );

        // Read the JSON file
        const jsonContent = fs.readFileSync(tmpFile, "utf8");

        // Clean up
        try {
          fs.unlinkSync(tmpFile);
        } catch (cleanupError) {
          console.error("Failed to cleanup temporary file:", cleanupError);
        }

        if (!jsonContent) {
          return "No bookmarks found";
        }

        let bookmarks = JSON.parse(jsonContent) as BookmarkItem[];

        // If there's a query, process it with AI
        if (input.query) {
          bookmarks = await processNaturalLanguageQuery(input.query, bookmarks);
        }

        return formatBookmarksAsMarkdown(bookmarks);
      } catch (dumpError) {
        console.error("Failed to read using dump approach:", dumpError);
        return `Error reading bookmarks: ${dumpError instanceof Error ? dumpError.message : String(dumpError)}\n\nPlease try closing Firefox and trying again.`;
      }
    }

    // For other errors, return the original error
    return `Error reading bookmarks: ${error instanceof Error ? error.message : String(error)}`;
  }
}
