import { LocalStorage } from "@raycast/api";
import { DifyApp, DifyAppType, DifyConversationType, DifyResponseMode } from "./types";
import fetch from "node-fetch";

export interface DifyResponse {
  message: string;
  conversation_id: string;
  message_id: string;
  used_app?: string;
  app_type?: string;
  [key: string]: unknown;
}

export interface DifyHistory {
  question: string;
  answer: string;
  timestamp: number;
  conversation_id: string;
  message_id: string;
  conversation_text?: string;
  used_app?: string;
  app_type?: string;
  user?: string; // Add user field to store the user ID
  inputs?: Record<string, unknown>; // Add inputs field for TextGenerator and Workflow apps
}

export interface DifyRequestOptions {
  conversationId?: string;
  user?: string;
  inputs?: { [key: string]: string } | Record<string, unknown>;
  responseMode?: DifyResponseMode; // Use enum instead of string to prevent invalid values
  waitForResponse?: boolean; // Whether to wait for complete response, defaults to true
  forceEmptyQuery?: boolean; // Allow empty queries for specific app types like Text Generator and Workflow
  onStreamingMessage?: (message: string, isComplete: boolean) => void; // Callback for streaming messages
  apiKey?: string; // API key for direct authentication
  endpoint?: string; // Custom endpoint URL
}

export interface AnalyzedQuery {
  appName: string | null;
  query: string;
}

// Define API response interfaces
interface ChatflowResponse {
  answer: string;
  conversation_id: string;
  message_id: string;
  metadata?: {
    usage?: unknown;
    retriever_resources?: unknown;
  };
}

// Define workflow response interfaces to handle both formats
interface WorkflowResponseData {
  id: string;
  workflow_id: string;
  status: string;
  outputs?: {
    answer?: string;
    result?: string;
    [key: string]: unknown;
  };
  error?: string;
  elapsed_time?: number;
  total_tokens?: number;
  total_steps?: number;
  created_at?: number;
  finished_at?: number;
}

interface WorkflowResponseWrapper {
  workflow_run_id: string;
  task_id: string;
  data: WorkflowResponseData;
}

// Type to handle both possible workflow response formats
type WorkflowResponse = WorkflowResponseData | WorkflowResponseWrapper;

interface CompletionResponse {
  event?: string; // "message" for Text Generator
  message_id?: string; // Unique message ID
  mode?: string; // "completion" for Text Generator
  answer?: string; // Complete response content
  metadata?: {
    usage?: unknown;
    retriever_resources?: unknown;
  };
  created_at?: number; // Message creation timestamp
  conversation_id?: string;
}

// Save history
export async function saveHistory(history: DifyHistory) {
  const histories = await getHistories();
  histories.unshift(history);
  await LocalStorage.setItem("dify-history", JSON.stringify(histories));
}

// Get history records
export async function getHistories(): Promise<DifyHistory[]> {
  const historiesStr = await LocalStorage.getItem("dify-history");
  return typeof historiesStr === "string" ? JSON.parse(historiesStr) : [];
}

// Clear history records
export async function clearHistories() {
  await LocalStorage.removeItem("dify-history");
}

// Delete a single conversation by its ID
export async function deleteConversation(conversationId: string) {
  const histories = await getHistories();
  const filteredHistories = histories.filter((history) => history.conversation_id !== conversationId);
  await LocalStorage.setItem("dify-history", JSON.stringify(filteredHistories));
}

// Update a conversation's text content
export async function updateConversation(conversationId: string, conversationText: string) {
  const histories = await getHistories();
  const updatedHistories = histories.map((history) => {
    if (history.conversation_id === conversationId) {
      return { ...history, conversation_text: conversationText };
    }
    return history;
  });
  await LocalStorage.setItem("dify-history", JSON.stringify(updatedHistories));
}

// Get conversation details by ID
export interface ConversationMessage {
  content: string;
  role: "user" | "assistant";
  id: string;
}

export interface Conversation {
  id: string;
  appName: string;
  appType: string;
  assistantName?: string;
  messages: ConversationMessage[];
}

// Retrieve a conversation by its ID
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  try {
    // Get all history entries
    const histories = await getHistories();

    // Find all entries with the matching conversation ID
    const conversationEntries = histories.filter((h) => h.conversation_id === conversationId);

    if (conversationEntries.length === 0) {
      console.log(`No conversation found with ID: ${conversationId}`);
      return null;
    }

    // Get the first entry to extract app info
    const firstEntry = conversationEntries[0];

    // Create a conversation object
    const conversation: Conversation = {
      id: conversationId,
      appName: firstEntry.used_app || "Dify",
      appType: firstEntry.app_type || DifyAppType.ChatflowAgent,
      messages: [],
    };

    // For simplicity, we'll assume the first entry contains the user query and AI response
    // This works for TextGenerator and Workflow which only have one round
    conversation.messages.push({
      content: firstEntry.question,
      role: "user",
      id: `${conversationId}-user`,
    });

    conversation.messages.push({
      content: firstEntry.answer,
      role: "assistant",
      id: firstEntry.message_id,
    });

    return conversation;
  } catch (error) {
    console.error("Error retrieving conversation:", error);
    return null;
  }
}

// Core request function
export async function askDify(query?: string, appName?: string, options?: DifyRequestOptions): Promise<DifyResponse> {
  console.log("askDify called with:", { query, appName, options });

  // If no app name is provided, try to detect it from the query
  let usedApp = appName;
  // Ensure query is always defined, even if null or undefined
  let finalQuery = query || "";

  if (!usedApp) {
    console.log("No app name provided, analyzing query to detect app...");
    const analyzed = await analyzeUserQuery(finalQuery);
    usedApp = analyzed.appName || "Auto-detected app";
    console.log(`App detection result: ${usedApp}`);

    // Only use the extracted query if an app was detected
    if (analyzed.appName) {
      finalQuery = analyzed.query;
      console.log(`Modified query: ${finalQuery}`);
    }
  }

  // Check if API key and endpoint are provided in options
  let apiKey = options?.apiKey;
  let endpoint = options?.endpoint;
  let appType;
  let appInputs;
  let conversationType;

  // If API key or endpoint not provided, load app details from storage
  if (!apiKey || !endpoint) {
    console.log("Loading app details for: " + usedApp);
    const appsJson = await LocalStorage.getItem<string>("dify-apps");
    const apps: DifyApp[] = appsJson ? JSON.parse(appsJson) : [];

    // Only log the number of apps, not the full list
    if (apps.length === 0) {
      console.log("No apps found in storage");
    }

    const appDetails = apps.find((app) => app.name === usedApp);
    console.log(`App details for "${usedApp}": ${appDetails ? "found" : "not found"}`);

    if (!appDetails) {
      throw new Error(`App "${usedApp}" not found. Please check your app name or add this app first.`);
    }

    // Use app details if not provided in options
    apiKey = apiKey || appDetails.apiKey;
    endpoint = endpoint || appDetails.endpoint;
    appType = appDetails.type;
    appInputs = appDetails.inputs;
    conversationType = appDetails.conversationType;

    // If waitForResponse is not specified in options, use the value from app configuration
    if (options && options.waitForResponse === undefined && appDetails.waitForResponse !== undefined) {
      options.waitForResponse = appDetails.waitForResponse;
    }
  } else {
    console.log(`Using provided API key and endpoint for app: ${usedApp}`);

    // When API key and endpoint are provided directly, we still need to get the app type
    if (!appType) {
      console.log(`Attempting to find app type for: ${usedApp}`);
      const appsJson = await LocalStorage.getItem<string>("dify-apps");
      const apps: DifyApp[] = appsJson ? JSON.parse(appsJson) : [];
      // Only find the specific app we need, don't log all apps
      const appDetails = apps.find((app) => app.name === usedApp);

      if (appDetails) {
        appType = appDetails.type;
        appInputs = appDetails.inputs;
        conversationType = appDetails.conversationType;
        console.log(`Found app type: ${appType}`);
        console.log(`Conversation type: ${conversationType || "default (continuous)"}`);
      } else {
        console.log(`Warning: Could not find app type for ${usedApp}`);
      }
    }
  }

  console.log(`Using app: ${usedApp} (${appType || "unknown type"})`);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`API Key: ${apiKey ? "******" : "missing"}`);
  console.log(`Inputs: ${JSON.stringify(appInputs || {})}`);

  // Check if non-wait mode is enabled
  const isNonWaitMode = options?.waitForResponse === false;
  if (isNonWaitMode) {
    console.log("Non-wait mode enabled: Will send API request but not wait for full response");
  }

  // Prepare request data
  const user = options?.user || `user_${Math.random().toString(36).substring(2, 10)}`;
  const conversationId = options?.conversationId || "";

  // Determine the API endpoint based on app type
  let apiEndpoint = "";
  let requestBody: Record<string, unknown> = {};

  if (appType === DifyAppType.ChatflowAgent) {
    // For chatflow/agent apps
    apiEndpoint = `${endpoint}/chat-messages`;

    // For chatflow/agent apps, we now allow empty queries
    // Just use an empty string as fallback
    finalQuery = finalQuery || "";

    requestBody = {
      query: finalQuery,
      user,
      inputs: options?.inputs || {},
      response_mode: options?.responseMode || DifyResponseMode.Blocking, // Use provided responseMode or default to blocking
    };

    // Add conversation_id, but only pass it when it's a valid UUID and the app type is not single call
    if (conversationId && conversationType !== DifyConversationType.SingleCall) {
      // Check if it's a valid UUID
      const isValidUUID = (id: string): boolean => {
        if (!id) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      };

      // Only pass when the ID is a valid UUID
      if (isValidUUID(conversationId)) {
        requestBody.conversation_id = conversationId;
        console.log(`Using valid conversation_id: ${conversationId}`);
      } else {
        console.log(`Ignoring invalid conversation_id: ${conversationId}`);
      }
    } else if (conversationType === DifyConversationType.SingleCall && conversationId) {
      console.log(`Ignoring conversation_id for single call app type: ${conversationId}`);
    }
  } else if (appType === DifyAppType.Workflow) {
    // For workflow apps
    apiEndpoint = `${endpoint}/workflows/run`;

    // For Workflow apps, we don't need to validate query as they don't use it
    // Official API documentation states Workflow only uses inputs defined by the application
    requestBody = {
      // No query parameter for Workflow apps
      inputs: options?.inputs || {},
      user,
      response_mode: options?.responseMode || DifyResponseMode.Blocking,
    };
  } else if (appType === DifyAppType.TextGenerator) {
    // For text completion apps
    apiEndpoint = `${endpoint}/completion-messages`;

    // Text Generator apps can accept empty queries as they rely on inputs
    // For completeness, include query only if it's not empty
    requestBody = {
      // Always include query parameter, even if it's empty
      query: finalQuery,
      inputs: options?.inputs || {},
      user,
      response_mode: options?.responseMode || DifyResponseMode.Blocking, // Use provided responseMode or default to blocking
    };
  } else {
    throw new Error(`Unsupported app type: ${appType}`);
  }

  try {
    // Special handling for non-wait mode
    if (isNonWaitMode) {
      console.log(`Making non-wait mode API request to: ${apiEndpoint}`);
      console.log(`Request body: ${JSON.stringify(requestBody)}`);

      // Use a 6-second timeout for non-wait mode
      // If no error occurs within 6 seconds, we consider the request successful
      try {
        // Create a timeout signal with 6 seconds
        const shortTimeoutSignal = AbortSignal.timeout(6000);

        // Start the request but don't wait for it to complete
        const requestPromise = fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: shortTimeoutSignal,
        });

        // Wait for 6 seconds to check for immediate errors
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            // If we reach 6 seconds with no errors, consider it a success
            console.log("6-second check passed with no errors, considering request successful");
            resolve(true);
          }, 6000);
        });

        // Race between the request and the timeout
        // If the request fails within 6 seconds, we'll get an error
        // If it doesn't fail within 6 seconds, the timeout will resolve first
        await Promise.race([
          requestPromise.then((response) => {
            // If we get a response within 6 seconds, check for auth errors
            if (response.status === 401 || response.status === 403) {
              throw new Error(`Authentication error: ${response.status} ${response.statusText}`);
            }
            console.log(`Quick response received: ${response.status} ${response.statusText}`);
          }),
          timeoutPromise,
        ]);

        // If we get here, either the request succeeded or we timed out without errors
        // Either way, we consider it a success for non-wait mode
        console.log("Non-wait mode request initiated successfully");
        return {
          message:
            "Your query has been successfully sent to Dify App in non-wait mode. The system will process your request in the background and follow the notification settings configured in your Dify application.",
          conversation_id: "",
          message_id: "",
          used_app: usedApp,
          app_type: appType ? appType.toString() : "unknown",
          non_wait_mode: true,
        };
      } catch (error) {
        // If we get an auth error, throw it immediately
        if (
          error instanceof Error &&
          (error.message.includes("Authentication") || error.message.includes("401") || error.message.includes("403"))
        ) {
          throw error;
        }

        // For other errors within 6 seconds, log but still return success
        // This is because we want to be lenient in non-wait mode
        console.log("Error in non-wait mode, but still considering request sent:", error);
        return {
          message:
            "Your query has been sent to Dify App in non-wait mode, but there might be connectivity issues. The system will attempt to process your request.",
          conversation_id: "",
          message_id: "",
          used_app: usedApp,
          app_type: appType ? appType.toString() : "unknown",
          non_wait_mode: true,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    // Regular wait mode handling below
    console.log(`Making API request to: ${apiEndpoint}`);
    console.log(`Request body: ${JSON.stringify(requestBody)}`);

    // Create a timeout signal
    const timeoutSignal = AbortSignal.timeout(120000);

    let response;
    try {
      response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: timeoutSignal,
      });

      console.log(`Response status: ${response.status} ${response.statusText}`);
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      if (fetchError instanceof Error && (fetchError.name === "AbortError" || fetchError.name === "TimeoutError")) {
        throw new Error("Request timed out after 120 seconds");
      }
      throw fetchError;
    }

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      let errorMessage = response.statusText;

      try {
        const errorData = (await response.json()) as { message?: string };
        errorMessage = errorData.message || response.statusText;
        console.error("Error response data:", errorData);
      } catch (parseError) {
        console.error("Could not parse error response as JSON", parseError);
        try {
          errorMessage = await response.text();
          console.error("Error response text:", errorMessage);
        } catch (textError) {
          console.error("Could not get response text:", textError);
          errorMessage = `HTTP error ${response.status}`;
        }
      }

      throw new Error(`Dify API error: ${errorMessage}`);
    }

    // Non-wait mode is handled earlier in the code

    // Process the response based on app type and response mode
    let result: DifyResponse;

    // Check if we're in streaming mode
    if (options?.responseMode === DifyResponseMode.Streaming) {
      // For streaming mode, we need to handle SSE (Server-Sent Events) format
      // We'll collect the full answer from the stream
      let fullAnswer = "";
      let conversationId = "";
      let messageId = "";
      let metadata = {};

      // Handle streaming response using fetch's native stream handling
      if (!response.body) {
        throw new Error("Response body is null");
      }

      // Use a TextDecoder to convert chunks to text
      const decoder = new TextDecoder();
      let buffer = "";

      // Use response body directly as stream reader
      const reader = response.body;

      // Process stream data
      try {
        // Process the stream
        for await (const chunk of reader) {
          const text = typeof chunk === "string" ? chunk : decoder.decode(chunk as Uint8Array, { stream: true });
          buffer += text;

          // Process complete events in the buffer
          // SSE format: each event starts with "data: " and ends with "\n\n"
          const events = buffer.split("\n\n");

          // Keep the last incomplete event in the buffer
          buffer = events.pop() || "";

          for (const event of events) {
            if (!event.trim() || !event.startsWith("data: ")) continue;

            try {
              // Extract the JSON part (remove "data: " prefix)
              const jsonStr = event.substring(6);
              const eventData = JSON.parse(jsonStr);

              console.log("Streaming event:", eventData.event);

              if (eventData.event === "message") {
                // Append to the answer
                const messageText = eventData.answer || "";
                fullAnswer += messageText;

                // Log the incoming chunk for debugging
                console.log(`Streaming chunk received: "${messageText}" (${messageText.length} chars)`);
                console.log(`Current full answer length: ${fullAnswer.length} chars`);

                // Call the streaming callback if provided with the full accumulated answer
                if (options?.onStreamingMessage) {
                  options.onStreamingMessage(fullAnswer, false);
                }

                // Save conversation and message IDs if not already set
                if (!conversationId && eventData.conversation_id) {
                  conversationId = eventData.conversation_id;
                }
                if (!messageId && eventData.message_id) {
                  messageId = eventData.message_id;
                }
              } else if (eventData.event === "message_end") {
                // End of message, save metadata
                console.log("Received message_end event");

                if (eventData.metadata) {
                  metadata = eventData.metadata;
                  console.log("Metadata received:", JSON.stringify(metadata));
                }

                if (!conversationId && eventData.conversation_id) {
                  conversationId = eventData.conversation_id;
                  console.log(`Setting conversation_id from message_end: ${conversationId}`);
                }

                if (!messageId && eventData.id) {
                  messageId = eventData.id;
                  console.log(`Setting message_id from message_end: ${messageId}`);
                }

                // We'll continue processing other events before signaling completion
                // This ensures we capture any remaining text chunks that might come after the message_end event

                // Update the UI with the current content, but don't mark as complete yet
                if (options?.onStreamingMessage) {
                  options.onStreamingMessage(fullAnswer, false);
                }
              } else if (eventData.event === "error") {
                // Instead of immediately throwing, capture the error message
                const errorMessage = `Stream error: ${eventData.message || "Unknown error"}`;
                console.error(errorMessage);

                // Set the error message as the fullAnswer so it gets returned to the user
                fullAnswer = errorMessage;

                // If we have conversation_id and message_id in the error event, capture them
                if (eventData.conversation_id && !conversationId) {
                  conversationId = eventData.conversation_id;
                }
                if (eventData.message_id && !messageId) {
                  messageId = eventData.message_id;
                }

                // Update the UI with the error message, but don't mark as complete yet
                // We'll signal completion after processing all events
                if (options?.onStreamingMessage) {
                  options.onStreamingMessage(errorMessage, false);
                }
              }
            } catch (parseError) {
              console.error("Error parsing SSE event:", parseError, "\nEvent data:", event);
            }
          }
        }
      } catch (error) {
        console.error("Error processing stream:", error);

        // Notify the callback about the error if provided
        if (options?.onStreamingMessage) {
          try {
            options.onStreamingMessage(`Error: ${error instanceof Error ? error.message : String(error)}`, true);
          } catch (callbackError) {
            console.error("Error in streaming callback:", callbackError);
          }
        }

        // Propagate the error instead of silently failing
        throw new Error(`Stream processing failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Print stream processing result for debugging
      console.log(
        `Stream processing result - fullAnswer: ${fullAnswer ? "received" : "empty"}, messageId: ${messageId || "not set"}`,
      );

      // Now that we've processed all events, signal completion to the callback
      console.log(`Stream processing complete. Final answer length: ${fullAnswer.length} chars`);
      console.log(`Final message_id: ${messageId}, conversation_id: ${conversationId}`);

      // Add a small delay before marking as complete to ensure all UI updates are processed
      if (options?.onStreamingMessage) {
        // First update with the final content
        options.onStreamingMessage(fullAnswer, false);

        // Then after a short delay, mark as complete
        setTimeout(() => {
          // Check again that callback is still defined before using it
          if (options?.onStreamingMessage) {
            options.onStreamingMessage(fullAnswer, true);
          }
        }, 100);
      }

      // If no message was received but there's a message ID, still return an empty result
      if (!fullAnswer && !messageId) {
        console.log("No message content received, but continuing anyway");
        // Instead of returning an empty result, provide a helpful error message
        fullAnswer = "Error: No response received from the AI. Please try again or check your query.";
        messageId = `msg_${Math.random().toString(36).substring(2, 10)}`;
      }

      // Create result from collected data
      result = {
        message: fullAnswer,
        conversation_id: conversationId || `stream_${Math.random().toString(36).substring(2, 10)}`,
        message_id: messageId || `msg_${Math.random().toString(36).substring(2, 10)}`,
        used_app: usedApp,
        app_type: appType ? appType.toString() : "unknown",
        ...metadata,
      };
    } else {
      // For blocking mode, process the JSON response
      if (appType === DifyAppType.ChatflowAgent) {
        const data = (await response.json()) as ChatflowResponse;
        result = {
          message: data.answer,
          conversation_id: data.conversation_id,
          message_id: data.message_id,
          used_app: usedApp,
          app_type: appType ? appType.toString() : "unknown",
          ...(data.metadata || {}),
        };
      } else if (appType === DifyAppType.Workflow) {
        const data = (await response.json()) as WorkflowResponse;
        console.log("Dify Workflow API response:", JSON.stringify(data, null, 2));

        // Check if this is the workflow_run_id and task_id wrapper format
        if ("workflow_run_id" in data && "task_id" in data && "data" in data) {
          // New format with data wrapper
          result = {
            message: JSON.stringify(data.data.outputs || {}),
            conversation_id: `workflow_${data.workflow_run_id}`,
            message_id: data.task_id,
            used_app: usedApp,
            app_type: appType ? appType.toString() : "unknown",
            workflow_id: data.data.workflow_id,
            status: data.data.status,
            workflow_data: data.data,
          };
        } else {
          // Original format
          const outputData = data.outputs || {};
          // Check if outputs contains answer or result directly
          const answerText = data.outputs?.answer || data.outputs?.result;

          result = {
            message: answerText || JSON.stringify(outputData),
            conversation_id: `workflow_${data.id}`,
            message_id: data.id,
            used_app: usedApp,
            app_type: appType ? appType.toString() : "unknown",
            workflow_id: data.workflow_id,
            status: data.status,
            workflow_data: data,
          };
        }
      } else {
        // TextGenerator
        const data = (await response.json()) as CompletionResponse;

        // Log the complete raw response for debugging
        console.log("Dify API response:", JSON.stringify(data, null, 2));

        // Verify that we got a proper response
        if (data.event !== "message" && !data.answer) {
          console.warn("Unexpected response format from Dify API:", data);
        }

        // Extract the answer from the response
        const answer = data.answer || "";
        console.log("Answer from API:", answer);

        // Use the message_id and conversation_id from the response if available
        // Do not generate random IDs if the API provides them
        const message_id = data.message_id || "";
        const conversation_id = data.conversation_id || "";

        result = {
          message: answer,
          conversation_id: conversation_id,
          message_id: message_id,
          used_app: usedApp,
          app_type: appType ? appType.toString() : "unknown",
          mode: data.mode || "completion",
          ...(data.metadata || {}),
        };

        // Log the final result object
        console.log("Returning result to Raycast:", result);
      }
    }

    return result;
  } catch (error: unknown) {
    console.error("Error calling Dify API:", error);
    if (
      (error instanceof Error && error.name === "TimeoutError") ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw new Error("Request timed out after 120 seconds");
    }
    throw error;
  }
}

/**
 * Analyzes a user query to extract the app name and the actual query content
 * @param userInput The raw user input string
 * @returns An object containing the extracted appName and query
 */
export async function analyzeUserQuery(userInput: string): Promise<AnalyzedQuery> {
  // Load all available apps for matching
  const appsJson = await LocalStorage.getItem<string>("dify-apps");
  const apps: DifyApp[] = appsJson ? JSON.parse(appsJson) : [];

  // Initialize result
  const result: AnalyzedQuery = {
    appName: null,
    query: userInput,
  };

  if (apps.length === 0) {
    return result; // No apps to match against
  }

  // Pattern 1: "Using [AppName], ..." or "With [AppName], ..."
  const usingPattern = /^(using|with)\s+([\w\s-]+?)[,:]\s*(.+)$/i;
  const usingMatch = userInput.match(usingPattern);

  if (usingMatch) {
    const potentialAppName = usingMatch[2].trim();
    const matchedApp = findBestMatchingApp(potentialAppName, apps);

    if (matchedApp) {
      result.appName = matchedApp.name;
      result.query = usingMatch[3].trim();
      return result;
    }
  }

  // Pattern 2: "[AppName]: ..."
  const colonPattern = /^([\w\s-]+?):\s*(.+)$/i;
  const colonMatch = userInput.match(colonPattern);

  if (colonMatch) {
    const potentialAppName = colonMatch[1].trim();
    const matchedApp = findBestMatchingApp(potentialAppName, apps);

    if (matchedApp) {
      result.appName = matchedApp.name;
      result.query = colonMatch[2].trim();
      return result;
    }
  }

  // Pattern 3: "Ask [AppName] ..."
  const askPattern = /^ask\s+([\w\s-]+?)\s+(.+)$/i;
  const askMatch = userInput.match(askPattern);

  if (askMatch) {
    const potentialAppName = askMatch[1].trim();
    const matchedApp = findBestMatchingApp(potentialAppName, apps);

    if (matchedApp) {
      result.appName = matchedApp.name;
      result.query = askMatch[2].trim();
      return result;
    }
  }

  // If no pattern matches, try to find app name mentions within the query
  for (const app of apps) {
    // Check if the app name is mentioned in the query
    const appNameLower = app.name.toLowerCase();
    const queryLower = userInput.toLowerCase();

    if (queryLower.includes(appNameLower)) {
      // Found an app name mention, but we need to be careful not to extract common words
      // Only consider it a match if the app name is at least 4 characters or a unique name
      if (app.name.length >= 4 || isUniqueAppName(app.name, apps)) {
        result.appName = app.name;
        // Don't modify the query in this case, as the app name is embedded in context
        break;
      }
    }
  }

  return result;
}

/**
 * Finds the best matching app from a list based on a potential app name
 * @param potentialName The potential app name to match
 * @param apps List of available Dify apps
 * @returns The best matching app or null if no good match
 */
function findBestMatchingApp(potentialName: string, apps: DifyApp[]): DifyApp | null {
  // Exact match
  const exactMatch = apps.find((app) => app.name.toLowerCase() === potentialName.toLowerCase());

  if (exactMatch) return exactMatch;

  // Partial match (app name contains the potential name or vice versa)
  const partialMatches = apps.filter((app) => {
    const appNameLower = app.name.toLowerCase();
    const potentialLower = potentialName.toLowerCase();
    return appNameLower.includes(potentialLower) || potentialLower.includes(appNameLower);
  });

  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  // If multiple partial matches, find the closest one
  if (partialMatches.length > 1) {
    // Sort by similarity (length of common substring)
    partialMatches.sort((a, b) => {
      const aCommon = commonSubstringLength(a.name.toLowerCase(), potentialName.toLowerCase());
      const bCommon = commonSubstringLength(b.name.toLowerCase(), potentialName.toLowerCase());
      return bCommon - aCommon; // Descending order
    });

    return partialMatches[0];
  }

  return null;
}

/**
 * Calculates the length of the longest common substring between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns Length of the longest common substring
 */
function commonSubstringLength(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  let maxLength = 0;

  // Create a table to store lengths of longest common suffixes
  const dp: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(0));

  // Fill the dp table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        maxLength = Math.max(maxLength, dp[i][j]);
      }
    }
  }

  return maxLength;
}

/**
 * Checks if an app name is unique enough to be considered a match
 * @param appName The app name to check
 * @param apps List of all apps
 * @returns True if the app name is unique enough
 */
function isUniqueAppName(appName: string, apps: DifyApp[]): boolean {
  // Common words that shouldn't be considered unique app names
  const commonWords = ["app", "chat", "assistant", "bot", "help", "ai", "dify"];

  if (commonWords.includes(appName.toLowerCase())) {
    return false;
  }

  // Check if this app name is significantly different from others
  const similarApps = apps.filter((app) => {
    if (app.name === appName) return false; // Skip the app itself

    const similarity =
      commonSubstringLength(app.name.toLowerCase(), appName.toLowerCase()) / Math.max(app.name.length, appName.length);
    return similarity > 0.7; // 70% similarity threshold
  });

  return similarApps.length === 0; // Unique if no similar apps
}
