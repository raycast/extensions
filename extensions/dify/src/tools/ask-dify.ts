import { askDify } from "../utils/dify-service";
import { LocalStorage, AI, environment } from "@raycast/api";
import { DifyApp, DifyConversationType } from "../utils/types";
import os from "os";

// Key name for storing recent conversation IDs
const RECENT_CONVERSATION_KEY = "dify-recent-conversations";

type Input = {
  /** User query content */
  query: string;
  /** Target Dify application name */
  appName: string;
  /** Application endpoint (from list-dify-apps tool) */
  endpoint?: string;
  /** Application type (from list-dify-apps tool) */
  appType?: string;
  /** Application input format or custom inputs (JSON string) */
  inputsFormat?: string;
  /** User identifier */
  user?: string;
  /** Response mode: blocking or streaming */
  responseMode?: string;
  /** Wait mode: whether to wait for full response */
  waitForResponse?: boolean;
  /** Conversation ID for continuing an existing conversation */
  conversationId?: string;
};

/**
 * Dify Query Tool - Send queries to a specified Dify application and get responses
 *
 * This tool needs to be used in conjunction with the list-dify-apps tool,
 * first get application information, then send the query
 */
export default async function askDifyTool(input: Input): Promise<string> {
  console.log("===== ASK DIFY TOOL CALLED =====");
  console.log("Input:", input);

  // For storing AI judgment result
  let shouldCreateNewConversation = false;

  try {
    // Validate required parameters
    if (!input.query || input.query.trim() === "") {
      console.error("Empty query received");
      return JSON.stringify({
        error: "Query content cannot be empty. Please provide a valid query.",
        message: "Query content cannot be empty. Please provide a valid query.",
      });
    }

    if (!input.appName || input.appName.trim() === "") {
      console.error("No app name provided");
      return JSON.stringify({
        error: "No application name provided. Please use the list-dify-apps tool first to get application information.",
        message:
          "No application name provided. Please use the list-dify-apps tool first to get application information.",
      });
    }

    // Extract parameters
    const query = input.query.trim();
    const appName = input.appName.trim();

    // Get system username for consistent user ID
    const systemUsername = os.userInfo().username;
    const user = input.user || `Raycast_${systemUsername}`;

    const responseMode = input.responseMode || "blocking";
    // If wait mode is explicitly specified in the input, use that value
    // Otherwise, we'll get it from the app details later
    const inputWaitForResponse = input.waitForResponse;

    // Get conversation ID if provided in the input
    let conversationId = input.conversationId || "";

    console.log(`Query: ${query}`);
    console.log(`App name: ${appName}`);
    console.log(`User ID: ${user}`);
    console.log(`Response mode: ${responseMode}`);
    console.log(
      `Wait mode from input: ${inputWaitForResponse === false ? "Non-Wait Mode" : inputWaitForResponse === true ? "Wait Mode" : "Using app default"}`,
    );
    console.log(`Conversation ID: ${conversationId || "New conversation"}`);

    // Get application details
    const appDetails = await getAppDetails(appName);

    if (!appDetails) {
      console.error(`App not found: ${appName}`);
      return JSON.stringify({
        error: `Could not find application named "${appName}". Please check the application name or add this application.`,
        message: `Could not find application named "${appName}". Please check the application name or add this application.`,
      });
    }

    console.log(`Found app details: ${appDetails.name} (${appDetails.type})`);
    console.log(`Endpoint: ${appDetails.endpoint}`);
    console.log(`API Key: ${appDetails.apiKey ? "******" : "missing"}`);
    console.log(`Conversation Type: ${appDetails.conversationType || "default (continuous)"}`);

    // Get the conversation type of the application
    const conversationType = appDetails.conversationType || DifyConversationType.Continuous;

    // If it's a continuous conversation type and no conversation ID is provided, try to get the most recent conversation ID
    if (conversationType === DifyConversationType.Continuous && !conversationId) {
      try {
        // Get recent conversations from local storage
        const recentConversationsJson = await LocalStorage.getItem<string>(RECENT_CONVERSATION_KEY);
        const recentConversations = recentConversationsJson ? JSON.parse(recentConversationsJson) : {};

        // Get the recent conversation ID for the specific application
        const recentConversationId = recentConversations[appName];
        if (recentConversationId) {
          console.log(`Found recent conversation ID for ${appName}: ${recentConversationId}`);
          conversationId = recentConversationId;
        }
      } catch (error) {
        console.error("Error retrieving recent conversation ID:", error);
      }
    }

    // If it's continuous conversation mode and there's a conversation ID, use AI to determine if a new conversation should be started
    if (conversationType === DifyConversationType.Continuous && conversationId && environment.canAccess(AI)) {
      try {
        console.log("Using AI to determine if user wants to start a new conversation...");
        const aiPrompt = `Analyze the following user query and determine if the user wants to start a brand new conversation (instead of continuing the current one).\n\nUser query: "${query}"\n\nIf the user explicitly indicates that they want to start a new conversation (e.g. "start over", "new conversation", "restart", "start fresh", "change topic", etc.), respond ONLY with "true". If there is no explicit indication, respond ONLY with "false".`;
        const aiResponse = await AI.ask(aiPrompt, {
          creativity: "none",
          model: AI.Model["OpenAI_GPT4o-mini"],
        });

        // Process AI response
        shouldCreateNewConversation = aiResponse.trim().toLowerCase() === "true";
        console.log(`AI judgment result - Does user want to start a new conversation: ${shouldCreateNewConversation}`);

        // If user wants to start a new conversation, clear the existing conversation ID
        if (shouldCreateNewConversation) {
          console.log("User wants to start a new conversation, clearing existing conversation ID");
          conversationId = "";
        } else {
          console.log("User wants to continue the current conversation, using existing conversation ID");
        }
      } catch (error) {
        console.error("Error using AI to determine conversation intent:", error);
        // If AI judgment fails, continue using the existing conversation ID by default
      }
    } else if (conversationType === DifyConversationType.SingleCall) {
      // In single call mode, always use an empty conversation ID
      conversationId = "";
      console.log("Single call mode, not using conversation ID");
    }

    // Parse input format
    const parsedInputs: { [key: string]: string } = {};

    // If inputsFormat is provided, try to parse it
    if (input.inputsFormat) {
      // Check if it looks like JSON
      if (input.inputsFormat.trim().startsWith("{") && input.inputsFormat.trim().endsWith("}")) {
        try {
          const inputsTemplate = JSON.parse(input.inputsFormat);
          // Use template to create inputs
          Object.keys(inputsTemplate).forEach((key) => {
            if (
              key.toLowerCase().includes("query") ||
              key.toLowerCase().includes("question") ||
              key.toLowerCase().includes("message")
            ) {
              parsedInputs[key] = query;
            }
          });
        } catch (error) {
          console.error("Error parsing inputsFormat:", error);
        }
      } else {
        // Not JSON, just log it as information
        console.log("inputsFormat is not JSON, treating as informational text:", input.inputsFormat);
      }
    } else if (appDetails.inputs) {
      // If the app details have input format, try to use it
      try {
        // Use app details input format to create inputs
        Object.keys(appDetails.inputs).forEach((key) => {
          if (
            key.toLowerCase().includes("query") ||
            key.toLowerCase().includes("question") ||
            key.toLowerCase().includes("message")
          ) {
            parsedInputs[key] = query;
          }
        });
      } catch (error) {
        console.error("Error using app inputs format:", error);
      }
    }

    // Use parsed inputs as final inputs
    const mergedInputs = parsedInputs;

    console.log("Final inputs:", mergedInputs);

    // Get the wait mode from app details if not specified in input
    const waitForResponse = inputWaitForResponse !== undefined ? inputWaitForResponse : appDetails.waitForResponse;

    try {
      // Call Dify API with API key and endpoint to avoid duplicate lookups
      console.log(`Using wait mode: ${waitForResponse === false ? "Non-Wait Mode" : "Wait Mode"}`);
      console.log(`Final conversation ID being used: ${conversationId || "<none>"}`);
      const response = await askDify(query, appName, {
        inputs: mergedInputs,
        user: user,
        responseMode: responseMode,
        waitForResponse: waitForResponse, // Pass wait mode parameter
        apiKey: appDetails.apiKey, // Pass API key directly
        endpoint: appDetails.endpoint, // Pass endpoint directly
        conversationId: conversationId, // Pass conversation ID if available
      });

      console.log("Dify API response received");

      // Build result
      const result = {
        message: response.message || "No response received from Dify.",
        used_app: response.used_app || appName,
        app_type: response.app_type || appDetails.type,
        conversation_id: response.conversation_id,
        message_id: response.message_id,
      };

      // If it's continuous conversation mode and a conversation ID was received, save it to local storage
      if (conversationType === DifyConversationType.Continuous && response.conversation_id) {
        try {
          // Read existing recent conversation information
          const recentConversationsJson = await LocalStorage.getItem<string>(RECENT_CONVERSATION_KEY);
          const recentConversations = recentConversationsJson ? JSON.parse(recentConversationsJson) : {};

          // Update the recent conversation ID for the specific application
          recentConversations[appName] = response.conversation_id;

          // Save back to local storage
          await LocalStorage.setItem(RECENT_CONVERSATION_KEY, JSON.stringify(recentConversations));
          console.log(`Saved conversation ID for ${appName}: ${response.conversation_id}`);
        } catch (error) {
          console.error("Error saving conversation ID:", error);
        }
      }

      console.log("Returning result to Raycast");
      return JSON.stringify(result);
    } catch (apiError) {
      // If in non-wait mode, return a success response even if an error occurs
      if (waitForResponse === false) {
        console.log("Error occurred in non-wait mode, returning success response anyway:", apiError);
        const result = {
          message:
            "Your query has been sent to Dify App in non-wait mode. Note: There was an issue with the API, but your request was attempted.",
          used_app: appName,
          app_type: appDetails.type,
          conversation_id: "",
          message_id: "",
          non_wait_mode: true,
          api_error: apiError instanceof Error ? apiError.message : String(apiError),
        };
        return JSON.stringify(result);
      }
      // If not in non-wait mode, continue to throw the error
      throw apiError;
    }
  } catch (error) {
    console.error("Error in ask-dify tool:", error);

    // Ensure useful information is returned even in case of error
    const errorMessage = error instanceof Error ? error.message : String(error);
    return JSON.stringify({
      error: errorMessage,
      message: `Error processing query: ${errorMessage}`,
    });
  }
}

/**
 * Get application details from local storage
 * @param appName Application name
 * @returns Application details, or null if not found
 */
async function getAppDetails(appName: string): Promise<DifyApp | null> {
  // Load application list from local storage
  const appsJson = await LocalStorage.getItem<string>("dify-apps");
  const apps: DifyApp[] = appsJson ? JSON.parse(appsJson) : [];

  // Find matching application
  const app = apps.find((app) => app.name.toLowerCase() === appName.toLowerCase()) || null;

  // Log conversation type if found
  if (app && app.conversationType) {
    console.log(`App conversation type: ${app.conversationType}`);
  }

  return app;
}
