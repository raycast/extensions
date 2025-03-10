import { askDify } from "./dify-service";
import { LocalStorage } from "@raycast/api";
import { DifyApp } from "./types";

// Raycast tool commands require string parameters
export default async function Command(query: string): Promise<string> {
  console.log("ask-dify tool called with query:", query);

  try {
    // Check if the query is empty
    if (!query || query.trim() === "") {
      console.error("Empty query received");
      return JSON.stringify({
        error: "Empty query received. Please provide valid parameters.",
      });
    }

    // Parse the query string as JSON to extract all parameters
    const params = JSON.parse(query);
    console.log("Parsed parameters:", params);

    // Check if this is a request to list applications
    if (params.list) {
      console.log("List apps request detected");
      return await listApps(params.limit || 5);
    }

    // Chat request processing
    // Extract parameters
    const appName = params.appName;
    const content = params.query;
    const inputs = params.inputs || {};
    // Use the provided user ID directly, ensuring it's never empty
    // This should be a consistent ID from the system username
    const user = params.user || `user_fallback_${Math.random().toString(36).substring(2, 10)}`;
    const conversationId = params.conversationId;
    // Get response mode
    const responseMode = params.responseMode || "blocking";

    console.log(`Initial app name: ${appName || "not provided"}`);
    console.log(`Content: ${content}`);
    console.log(`User ID: ${user}`);
    console.log(`Conversation ID: ${conversationId || "not provided"}`);
    console.log(`Response mode: ${responseMode}`);

    // If no appName is provided, we'll let the askDify function handle it
    // The askDify function will automatically analyze the query
    if (!appName) {
      console.log("No app name provided, will use auto-detection in askDify");
    }

    // Call the Dify API with all parameters
    console.log("Calling Dify API with:", {
      content,
      appName,
      inputs,
      user,
      conversationId,
      responseMode,
    });

    // Create a callback function to handle streaming messages
    const onStreamingMessage =
      responseMode === "streaming"
        ? (message: string, isComplete: boolean) => {
            console.log(
              `Streaming message received (${isComplete ? "complete" : "partial"}): ${message.substring(0, 50)}${message.length > 50 ? "..." : ""}`,
            );
          }
        : undefined;

    // Call askDify function
    let response;
    try {
      console.log("Calling askDify with streaming support...");
      response = await askDify(content, appName, {
        inputs: inputs,
        user: user,
        conversationId: conversationId,
        responseMode: responseMode,
        onStreamingMessage: onStreamingMessage,
      });
    } catch (error) {
      console.error("Error with streaming API call:", error);
      throw error;
    }

    console.log("Dify API response:", response);

    // Return JSON string with all necessary information
    const result = {
      message: response.message,
      used_app: response.used_app || "Auto-detected app",
      app_type: response.app_type || "Unknown",
      conversation_id: response.conversation_id,
      message_id: response.message_id,
    };

    console.log("Returning result to Raycast:", result);
    return JSON.stringify(result);
  } catch (error) {
    console.error("Error in ask-dify tool:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error details:", errorMessage);
    return JSON.stringify({ error: errorMessage });
  }
}

/**
 * List all Dify applications
 */
async function listApps(limit: number): Promise<string> {
  console.log(`Listing Dify apps with limit: ${limit}`);
  try {
    // Load application list from local storage
    const appsJson = await LocalStorage.getItem<string>("dify-apps");
    const apps: DifyApp[] = appsJson ? JSON.parse(appsJson) : [];

    console.log(`Found ${apps.length} apps in storage`);

    if (apps.length === 0) {
      return JSON.stringify({
        message: "No Dify applications found. Please add an application first.",
        apps: [],
        total: 0,
        showing: 0,
      });
    }

    // Limit the number of returned applications
    const limitedApps = apps.slice(0, limit);

    // Format application information - new format
    const formattedApps = limitedApps.map((app) => {
      // Generate example inputs format
      const exampleInputs = app.type.toLowerCase().includes("agent")
        ? { query: "your question here" }
        : { message: "your message here" };

      // Generate simple description (English)
      const description = app.type.toLowerCase().includes("agent")
        ? "Intelligent agent application that can answer complex questions"
        : "Conversational application for natural dialogue";

      return {
        name: app.name,
        type: app.type,
        endpoint: app.endpoint,
        inputs_format: JSON.stringify(exampleInputs, null, 2),
        description: description,
      };
    });

    // Build response
    const result = {
      message: `Found ${apps.length} Dify application${apps.length > 1 ? "s" : ""}${apps.length > limit ? `, showing the first ${limit}` : ""}:`,
      apps: formattedApps,
      total: apps.length,
      showing: limitedApps.length,
    };

    console.log("Returning apps list:", result);
    return JSON.stringify(result);
  } catch (error) {
    console.error("Error listing apps:", error);
    return JSON.stringify({
      error: `Failed to list Dify applications: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
