import { LocalStorage, AI } from "@raycast/api";
import { DifyApp } from "../utils/types";

type Input = {
  /** The natural language query from the user */
  query: string;
};

/**
 * Find the best matching Dify application based on user input using AI
 * @param query User's natural language query
 * @param apps List of applications
 * @returns The best matching application or null if no match
 */
async function findBestMatchingAppWithAI(query: string, apps: DifyApp[]): Promise<DifyApp | null> {
  if (!apps || apps.length === 0) return null;

  try {
    // Create a context with all apps information for the AI to reason about
    const appsContext = apps.map((app) => ({
      name: app.name,
      type: app.type,
      endpoint: app.endpoint,
      description: app.description || "No description provided",
      inputs: Object.keys(app.inputs || {}).join(", ") || "No specific inputs required",
    }));

    // Create the prompt for AI
    const prompt = `
    I have the following Dify applications:
    ${JSON.stringify(appsContext, null, 2)}
    
    Based on the user query: "${query}"
    
    Which application is the most relevant match? Consider all aspects including name, type, endpoint, description, and inputs.
    Return only the name of the best matching application, or "NO_MATCH" if none are relevant.
    `;

    // Ask AI to find the best match
    const aiResponse = await AI.ask(prompt, {
      creativity: "low", // We want precise matching, not creative responses
    });

    // Extract the app name from AI response
    const appName = aiResponse.trim();

    // If AI couldn't find a match
    if (appName === "NO_MATCH") {
      return null;
    }

    // Find the app with the matching name
    const matchedApp = apps.find(
      (app) =>
        app.name.toLowerCase() === appName.toLowerCase() ||
        appName.toLowerCase().includes(app.name.toLowerCase()) ||
        app.name.toLowerCase().includes(appName.toLowerCase()),
    );

    return matchedApp || null;
  } catch (error) {
    console.error("Error using AI for app matching:", error);

    // Fallback to traditional matching if AI fails
    return findBestMatchingAppTraditional(query, apps);
  }
}

/**
 * Traditional matching algorithm as fallback
 * @param query User query
 * @param apps List of applications
 * @returns The best matching application
 */
function findBestMatchingAppTraditional(query: string, apps: DifyApp[]): DifyApp | null {
  if (!apps || apps.length === 0) return null;

  const searchTerm = query.toLowerCase();

  // Calculate matching score for each application
  const appsWithScores = apps.map((app) => {
    let score = 0;

    // Name matching (highest weight)
    const name = app.name.toLowerCase();
    if (name === searchTerm) {
      score += 100;
    } else if (name.includes(searchTerm) || searchTerm.includes(name)) {
      score += 50;
    } else {
      const searchWords = searchTerm.split(/\s+/);
      const nameWords = name.split(/\s+/);

      for (const searchWord of searchWords) {
        if (searchWord.length <= 2) continue;
        for (const nameWord of nameWords) {
          if (nameWord.includes(searchWord) || searchWord.includes(nameWord)) {
            score += 10;
          }
        }
      }
    }

    // Endpoint matching
    if (app.endpoint) {
      const endpoint = app.endpoint.toLowerCase();
      if (endpoint === searchTerm) {
        score += 80;
      } else if (endpoint.includes(searchTerm) || searchTerm.includes(endpoint)) {
        score += 40;
      }
    }

    // Description matching
    if (app.description) {
      const description = app.description.toLowerCase();
      if (description.includes(searchTerm)) {
        score += 60;
      } else {
        const searchWords = searchTerm.split(/\s+/);
        for (const word of searchWords) {
          if (word.length > 2 && description.includes(word)) {
            score += 15;
          }
        }
      }
    }

    // Type matching
    const type = app.type.toString().toLowerCase();
    if (type === searchTerm) {
      score += 70;
    } else if (type.includes(searchTerm) || searchTerm.includes(type)) {
      score += 35;
    }

    // Inputs matching
    const inputKeys = Object.keys(app.inputs || {})
      .join(" ")
      .toLowerCase();
    if (inputKeys.includes(searchTerm)) {
      score += 30;
    }

    return { app, score };
  });

  // Sort by score
  appsWithScores.sort((a, b) => b.score - a.score);

  // Return the best match, or null if the highest score is 0
  return appsWithScores[0]?.score > 0 ? appsWithScores[0].app : null;
}

/**
 * Parse user input to extract search intent
 * @param query User input
 * @returns Extracted search intent
 */
function parseUserInput(query: string): {
  searchTerm: string | null;
  timeFilter?: { type: string; value: number; unit: string };
} {
  if (!query || query.trim() === "") {
    return { searchTerm: null };
  }

  const queryLower = query.toLowerCase();

  // Check if it's a request to list applications
  const listPatterns = [
    /list\s+(?:all\s+)?(?:my\s+)?(?:dify\s+)?apps/i,
    /show\s+(?:all\s+)?(?:my\s+)?(?:dify\s+)?apps/i,
    /display\s+(?:all\s+)?(?:my\s+)?(?:dify\s+)?apps/i,
    /what\s+(?:dify\s+)?apps\s+(?:do\s+i\s+have|are\s+available)/i,
  ];

  for (const pattern of listPatterns) {
    if (pattern.test(queryLower)) {
      return { searchTerm: "list_all" };
    }
  }

  // Check for time-based queries

  // Recent apps patterns (e.g., "show my recent apps", "my last 3 apps")
  const recentAppsPatterns = [
    /(?:show|display|list|get)\s+(?:my\s+)?(?:recent|latest|newest|last)\s+(?:dify\s+)?apps/i,
    /(?:my|the)\s+(?:recent|latest|newest|last)\s+(?:dify\s+)?apps/i,
    /(?:what\s+are\s+)?(?:my|the)\s+(?:recent|latest|newest|last)\s+(?:dify\s+)?apps/i,
  ];

  for (const pattern of recentAppsPatterns) {
    if (pattern.test(queryLower)) {
      return {
        searchTerm: "time_based",
        timeFilter: {
          type: "recent",
          value: 5, // Default to showing 5 most recent apps
          unit: "recent",
        },
      };
    }
  }

  // Specific number of recent apps (e.g., "my last 3 apps")
  const specificNumberPattern = /(?:my|the)\s+(?:recent|latest|newest|last)\s+(\d+)\s+(?:dify\s+)?apps/i;
  const specificNumberMatch = queryLower.match(specificNumberPattern);

  if (specificNumberMatch && specificNumberMatch[1]) {
    const count = parseInt(specificNumberMatch[1], 10);
    if (!isNaN(count) && count > 0) {
      return {
        searchTerm: "time_based",
        timeFilter: {
          type: "recent",
          value: count,
          unit: "recent",
        },
      };
    }
  }

  // Time period patterns (e.g., "apps from last 2 days", "apps created in the last week")
  const timePeriodPattern =
    /(?:apps|dify apps)\s+(?:from|created|added|made)\s+(?:in|during|within)?\s+(?:the\s+)?(?:last|past)\s+(\d+)\s+(day|days|week|weeks|month|months)/i;
  const timePeriodMatch = queryLower.match(timePeriodPattern);

  if (timePeriodMatch && timePeriodMatch[1] && timePeriodMatch[2]) {
    const value = parseInt(timePeriodMatch[1], 10);
    const unit = timePeriodMatch[2].toLowerCase();

    if (!isNaN(value) && value > 0) {
      return {
        searchTerm: "time_based",
        timeFilter: {
          type: "recent",
          value: value,
          unit: unit,
        },
      };
    }
  }

  // Specific time ago patterns (e.g., "apps created 3 days ago", "apps from 1 week ago")
  const timeAgoPattern =
    /(?:apps|dify apps)\s+(?:created|added|made|from)\s+(\d+)\s+(day|days|week|weeks|month|months)\s+ago/i;
  const timeAgoMatch = queryLower.match(timeAgoPattern);

  if (timeAgoMatch && timeAgoMatch[1] && timeAgoMatch[2]) {
    const value = parseInt(timeAgoMatch[1], 10);
    const unit = timeAgoMatch[2].toLowerCase();

    if (!isNaN(value) && value > 0) {
      return {
        searchTerm: "time_based",
        timeFilter: {
          type: "specific",
          value: value,
          unit: unit,
        },
      };
    }
  }

  // For all other queries, we'll use the AI to determine the best match
  return { searchTerm: "find_with_ai" };
}

/**
 * Filter applications based on time criteria
 * @param apps List of applications
 * @param timeFilter Time filter criteria
 * @returns Filtered list of applications
 */
function filterAppsByTime(apps: DifyApp[], timeFilter: { type: string; value: number; unit: string }): DifyApp[] {
  if (!apps || apps.length === 0) return [];

  // Get current date for comparison
  const now = new Date();

  // Calculate the target date based on the time filter
  const targetDate = new Date(now);
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  // Convert unit to milliseconds
  const unitToMs: Record<string, number> = {
    day: 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    months: 30 * 24 * 60 * 60 * 1000,
    recent: 24 * 60 * 60 * 1000, // Default to 1 day for "recent"
  };

  const msToSubtract = (timeFilter.value || 1) * (unitToMs[timeFilter.unit] || unitToMs.recent);

  if (timeFilter.type === "recent") {
    // For recent apps, get all apps created within the specified time period
    targetDate.setTime(now.getTime() - msToSubtract);
    startDate = targetDate;
    endDate = now;
  } else if (timeFilter.type === "specific") {
    // For specific time period, get apps created around that specific time
    const exactDate = new Date(now.getTime() - msToSubtract);

    // Create a window around the specific date (±12 hours)
    const windowSize = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
    startDate = new Date(exactDate.getTime() - windowSize);
    endDate = new Date(exactDate.getTime() + windowSize);
  }

  // If we couldn't determine dates, return all apps
  if (!startDate || !endDate) return apps;

  // Filter apps based on creation time
  return apps.filter((app) => {
    // If app has no createdAt timestamp, skip it
    if (!app.createdAt) return false;

    try {
      // Extract the ISO date string from the format "2025-03-06T14:37:24.000Z (Asia/Shanghai)"
      const dateStr = app.createdAt.split(" ")[0]; // Get the ISO part
      const appDate = new Date(dateStr);

      // Check if the app was created within the target time range
      return appDate >= startDate! && appDate <= endDate!;
    } catch (error) {
      console.error("Error parsing date:", error);
      return false; // Skip apps with invalid dates
    }
  });
}

/**
 * Format input requirements for a Dify application
 * @param app The Dify application
 * @returns Formatted input requirements string
 */
function formatInputRequirements(app: DifyApp): string {
  if (!app.inputs || Object.keys(app.inputs).length === 0) {
    return "No specific input parameters required";
  }

  // Create example inputs based on app type
  const exampleInputs: Record<string, string> = app.type.toLowerCase().includes("agent")
    ? { query: "your question here" }
    : { message: "your message here" };

  // Add any custom inputs from the app
  Object.keys(app.inputs || {}).forEach((key) => {
    if (!exampleInputs[key]) {
      exampleInputs[key] = `your ${key} here`;
    }
  });

  return JSON.stringify(exampleInputs, null, 2);
}

/**
 * Generate a description for a Dify application based on its type
 * @param app The Dify application
 * @returns Generated description
 */
function generateAppDescription(app: DifyApp): string {
  if (app.description) {
    return app.description;
  }

  // Generate a description based on app type
  if (app.type.toLowerCase().includes("agent")) {
    return "An intelligent agent application that can answer complex questions and perform tasks";
  } else if (app.type.toLowerCase().includes("workflow")) {
    return "A workflow application that can process sequential operations and tasks";
  } else if (app.type.toLowerCase().includes("generator")) {
    return "A text generation application that can create content based on prompts";
  }

  return "A Dify application";
}

/**
 * List Dify Applications AI Tool
 * Supports natural language queries to list all applications or find specific ones
 * using advanced AI-powered matching
 */
export default async function listDifyAppsTool(input: Input): Promise<string> {
  console.log("===== LIST DIFY APPS TOOL CALLED =====");
  console.log("Query:", input.query);

  try {
    // Check if query is empty
    if (!input.query || input.query.trim() === "") {
      console.log("Empty query received");
      return JSON.stringify({
        message:
          "Please provide a query about Dify applications. You can ask to list your apps or find a specific app.",
      });
    }

    // Parse user input
    const { searchTerm, timeFilter } = parseUserInput(input.query);
    console.log(`Parsed input - Search Term: ${searchTerm || "none"}`);
    if (timeFilter) {
      console.log(`Time filter - Type: ${timeFilter.type}, Value: ${timeFilter.value}, Unit: ${timeFilter.unit}`);
    }

    // Get application list from local storage
    const appsJson = await LocalStorage.getItem<string>("dify-apps");
    let apps: DifyApp[] = [];

    try {
      // Safely parse JSON with error handling
      apps = appsJson ? JSON.parse(appsJson) : [];
    } catch (error) {
      console.error("Error parsing apps JSON:", error);
      // Continue with empty apps array if parsing fails
    }

    console.log(`Found ${apps.length} apps in storage`);

    // If no applications, return prompt message
    if (apps.length === 0) {
      return JSON.stringify({
        message: "No Dify applications found. Please add an application first.",
        apps: [],
        total: 0,
      });
    }

    // Process request based on search type
    if (searchTerm === "list_all") {
      // List all applications
      console.log("Listing all apps");

      // Format application information
      const formattedApps = apps.map((app) => ({
        name: app.name,
        type: app.type,
        endpoint: app.endpoint,
        description: generateAppDescription(app),
        inputs_format: formatInputRequirements(app),
        response_mode: app.responseMode || "blocking",
        created_at: app.createdAt || "Unknown",
        updated_at: app.updatedAt || "Unknown",
      }));

      return JSON.stringify({
        message: `Found ${apps.length} Dify application${apps.length > 1 ? "s" : ""}:`,
        apps: formattedApps,
        total: apps.length,
      });
    } else if (searchTerm === "time_based" && timeFilter) {
      // Handle time-based queries
      console.log(`Processing time-based query with filter: ${JSON.stringify(timeFilter)}`);

      // Filter apps based on time criteria
      const filteredApps = filterAppsByTime(apps, timeFilter);
      console.log(`Found ${filteredApps.length} apps matching time criteria`);

      // Sort by creation time (newest first)
      filteredApps.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt.split(" ")[0]) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt.split(" ")[0]) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      // Limit results if needed (e.g., "my last 2 apps")
      let limitedApps = filteredApps;
      if (timeFilter.type === "recent" && timeFilter.unit === "recent") {
        limitedApps = filteredApps.slice(0, timeFilter.value);
      }

      // Format application information
      const formattedApps = limitedApps.map((app) => ({
        name: app.name,
        type: app.type,
        endpoint: app.endpoint,
        description: generateAppDescription(app),
        inputs_format: formatInputRequirements(app),
        response_mode: app.responseMode || "blocking",
        created_at: app.createdAt || "Unknown",
        updated_at: app.updatedAt || "Unknown",
      }));

      // Construct appropriate message based on the time filter
      let message = "";
      if (timeFilter.type === "recent") {
        if (timeFilter.unit === "recent") {
          message = `Found ${limitedApps.length} most recent Dify application${limitedApps.length > 1 ? "s" : ""}:`;
        } else {
          message = `Found ${limitedApps.length} Dify application${limitedApps.length > 1 ? "s" : ""} created in the last ${timeFilter.value} ${timeFilter.unit}:`;
        }
      } else if (timeFilter.type === "specific") {
        message = `Found ${limitedApps.length} Dify application${limitedApps.length > 1 ? "s" : ""} created around ${timeFilter.value} ${timeFilter.unit} ago:`;
      }

      return JSON.stringify({
        message: message,
        apps: formattedApps,
        total: limitedApps.length,
        time_filter_applied: {
          type: timeFilter.type,
          value: timeFilter.value,
          unit: timeFilter.unit,
        },
      });
    } else if (searchTerm === "find_with_ai") {
      // Find specific application using AI
      console.log(`Searching for app with query: ${input.query}`);

      // Find best matching application
      const matchedApp = await findBestMatchingAppWithAI(input.query, apps);

      if (matchedApp) {
        console.log(`Found matching app: ${matchedApp.name}`);

        // Format application information
        const formattedApp = {
          name: matchedApp.name,
          type: matchedApp.type,
          endpoint: matchedApp.endpoint,
          description: generateAppDescription(matchedApp),
          inputs_format: formatInputRequirements(matchedApp),
          response_mode: matchedApp.responseMode || "blocking",
        };

        return JSON.stringify({
          message: `Found Dify application "${matchedApp.name}" that matches your query:`,
          app: formattedApp,
          found: true,
          match_criteria:
            "Your query matched this application based on its name, endpoint, description, and other properties.",
        });
      } else {
        console.log("No matching app found");

        // Return all applications as alternatives
        const formattedApps = apps.map((app) => ({
          name: app.name,
          type: app.type,
          endpoint: app.endpoint,
          description: generateAppDescription(app),
          inputs_format: formatInputRequirements(app),
        }));

        return JSON.stringify({
          message: `No Dify application found matching your query: "${input.query}". Here are all available applications:`,
          apps: formattedApps,
          found: false,
          total: apps.length,
        });
      }
    }

    // Default: return all applications
    console.log("Default: listing all apps");

    // Format application information
    const formattedApps = apps.map((app) => ({
      name: app.name,
      type: app.type,
      endpoint: app.endpoint,
      description: generateAppDescription(app),
      inputs_format: formatInputRequirements(app),
    }));

    return JSON.stringify({
      message: `Found ${apps.length} Dify application${apps.length > 1 ? "s" : ""}:`,
      apps: formattedApps,
      total: apps.length,
    });
  } catch (error) {
    console.error("Error in list-dify-apps tool:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return JSON.stringify({
      error: errorMessage,
      message: "An error occurred while processing your request.",
    });
  }
}
