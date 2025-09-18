import { askDify } from "../utils/dify-service";
import { LocalStorage, AI, environment } from "@raycast/api";
import { DifyApp, DifyConversationType, DifyResponseMode, DifyAppType } from "../utils/types";
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
  responseMode?: DifyResponseMode;
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
    // We'll validate the query based on app type after getting app details
    // Initialize query to empty string if not provided
    input.query = input.query || "";

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

    const responseMode = input.responseMode || DifyResponseMode.Blocking;
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

    // Only validate empty queries for Chatflow/Agent apps
    // Text Generator and Workflow apps can accept empty queries
    if (appDetails.type === DifyAppType.ChatflowAgent && (!query || query === "")) {
      console.error("Empty query received for Chatflow/Agent app");
      return JSON.stringify({
        error: "Missing Query. Please enter a query to ask Dify",
        message: "Missing Query. Please enter a query to ask Dify",
      });
    }

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

    // Initialize inputs object
    const parsedInputs: { [key: string]: string } = {};
    let hasInputs = false;

    // Check if the app details have inputs defined
    if (appDetails.inputs && Object.keys(appDetails.inputs).length > 0) {
      // Filter out invalid input field names (empty or whitespace only)
      const validInputs: { [key: string]: string } = {};
      for (const key of Object.keys(appDetails.inputs)) {
        if (key.trim() !== "") {
          validInputs[key] = appDetails.inputs[key] as string;
        } else {
          console.log("Skipping invalid input field name (empty or whitespace only)");
        }
      }

      // Only proceed if there are valid inputs
      if (Object.keys(validInputs).length > 0) {
        hasInputs = true;
        console.log("App has defined inputs:", validInputs);

        // Get the required input fields from app details
        const inputFields = Object.keys(validInputs);

        // If there are input fields and AI is available, use AI to extract values
        if (inputFields.length > 0 && environment.canAccess(AI)) {
          console.log("Using AI to extract input values from query...");

          try {
            // Construct AI prompt to extract values
            const aiPrompt = `You need to extract specific information from a user query to fill in required input fields for a Dify application.

User query: "${query}"

Required input fields:
${inputFields.map((field) => `- ${field}`).join("\n")}

For each field, provide ONLY the extracted value. If a value is not present in the query, respond with "not specified".
Format your response exactly like this:
${inputFields.map((field) => `${field}: [extracted value]`).join("\n")}`;

            const aiResponse = await AI.ask(aiPrompt, {
              creativity: "low",
              model: AI.Model["OpenAI_GPT4o-mini"],
            });

            console.log("AI extraction response:", aiResponse);

            // Parse AI response
            const lines = aiResponse.split("\n").filter((line) => line.trim() !== "");
            for (const line of lines) {
              const match = line.match(/^([^:]+):\s*(.+)$/i);
              if (match) {
                const [, field, value] = match;
                const trimmedField = field.trim();
                const trimmedValue = value.trim();

                // Only use the extracted value if it's not "not specified"
                if (
                  trimmedValue.toLowerCase() !== "not specified" &&
                  inputFields.some((f) => f.toLowerCase() === trimmedField.toLowerCase())
                ) {
                  console.log(`AI extracted value for ${trimmedField}: ${trimmedValue}`);
                  parsedInputs[trimmedField] = trimmedValue;
                }
              }
            }
          } catch (aiError) {
            console.error("Error using AI to extract input values:", aiError);
          }
        }

        // For any fields that weren't extracted by AI, use default values if they exist
        inputFields.forEach((field) => {
          if (!parsedInputs[field] && typeof validInputs[field] === "string" && validInputs[field] !== "") {
            parsedInputs[field] = validInputs[field] as string;
            console.log(`Using default value for ${field}: ${parsedInputs[field]}`);
          }
        });
      }
    } else {
      console.log("App does not have defined inputs, using only query");
    }

    // Use parsed inputs as final inputs, but only if the app has defined inputs
    // For all app types, we use the same approach: extract inputs from the user query
    const mergedInputs = hasInputs ? parsedInputs : {};

    // We don't add the original query to inputs anymore
    // The query is only used to extract structured inputs via AI
    // This applies to all app types: Chatflow, Workflow, and Text Generator
    console.log("Using extracted inputs from user query");

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
