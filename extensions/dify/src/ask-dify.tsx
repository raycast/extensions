import { useState, useEffect, useRef } from "react";
import { Action, ActionPanel, Form, List, Toast, showToast, LocalStorage, Icon } from "@raycast/api";
import { saveHistory, getHistories, DifyHistory } from "./utils/dify-service";
import askDify from "./utils/ask-dify";
import { DifyAppType, DifyApp, getAppTypeColor } from "./utils/types";
import os from "os";

// Define form values interface
interface FormValues {
  input: string;
  appName: string;
  inputs: string;
  user: string;
}

// Get app by name
async function getSelectedApp(appName: string): Promise<DifyApp | undefined> {
  try {
    const appsJson = await LocalStorage.getItem<string>("dify-apps");
    const apps: DifyApp[] = appsJson ? JSON.parse(appsJson) : [];
    return apps.find((app) => app.name === appName);
  } catch (error) {
    console.error("Error getting selected app:", error);
    return undefined;
  }
}

// Define chat message interface
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// Define chat session interface
interface ChatSession {
  id: string;
  messages: ChatMessage[];
  title: string;
  appName?: string;
  appType?: string;
  assistantName?: string;
  responseMode?: string;
}

// Helper function to get app type text
function getAppTypeText(appType: DifyAppType): string {
  switch (appType) {
    case DifyAppType.ChatflowAgent:
      return "Chatflow/Agent";
    case DifyAppType.Workflow:
      return "Workflow";
    case DifyAppType.TextGenerator:
      return "Text Generator";
    default:
      return "Unknown";
  }
}

// Form view component - first level UI (select app and input query)
function QueryFormView(props: {
  onSubmit: (values: FormValues) => void;
  conversationId?: string;
  preselectedAppName?: string;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [apps, setApps] = useState<DifyApp[]>([]);
  const [inputsPlaceholder, setInputsPlaceholder] = useState<string>("{}");
  const [inputsValue, setInputsValue] = useState<string>("");
  const [queryInput, setQueryInput] = useState("");
  // Set initial state to empty string to avoid controlled/uncontrolled component switching issues
  const [selectedAppName, setSelectedAppName] = useState("");
  // Store preselected app name reference
  const preselectedAppNameRef = useRef<string | undefined>(props.preselectedAppName);
  const [inputsDescription, setInputsDescription] = useState<string>(
    'Optional. Only required if your selected Dify app has defined input variables. You can provide values in JSON format like {"var1": "value1"} or simply as comma-separated values matching the order of variables.',
  );

  // Add error states
  const [queryError, setQueryError] = useState<string | undefined>();
  const [appNameError, setAppNameError] = useState<string | undefined>();

  // Track if user has manually modified the inputs
  // No longer tracking if user modified inputs - removed userModifiedInputs state

  // Track if apps have been loaded
  const appsLoadedRef = useRef(false);

  // Using useRef to track the previous inputsValue to avoid circular dependencies
  const prevInputsValueRef = useRef<string>(inputsValue);

  // Reference to the user ID field for clearing it
  const userIdFieldRef = useRef<Form.TextField>(null);

  // Update input placeholder and description based on selected app
  useEffect(() => {
    // Skip if no app selected or no apps available
    if (!selectedAppName || apps.length === 0) {
      return;
    }

    // Find the selected app
    const app = apps.find((app) => app.name === selectedAppName);

    if (app && app.inputs && Object.keys(app.inputs).length > 0) {
      // Update input placeholder with examples
      const inputKeys = Object.keys(app.inputs);

      // Create examples for different input formats
      const jsonExample = JSON.stringify(app.inputs, null, 2);
      const namedParamsExample = inputKeys.map((key, index) => `${key}=value${index + 1}`).join(", ");

      const positionalExample = inputKeys.map((key, index) => `value${index + 1}`).join(", ");

      // Set comprehensive placeholder with multiple examples
      const placeholder =
        `${jsonExample}\n\n` +
        `Named Parameters Format:\n${namedParamsExample}\n\n` +
        `Simple Format (positional values):\n${positionalExample}`;

      // Update placeholder
      setInputsPlaceholder(placeholder);

      // Create a descriptive message about the required inputs with clear examples
      const inputsDescriptionText =
        `📍 ${selectedAppName} requires the following inputs: ${inputKeys.map((k) => `\`${k}\``).join(", ")}\n\n` +
        `📍 Examples:\n` +
        `• JSON format: \`${JSON.stringify(Object.fromEntries(inputKeys.map((k, i) => [k, `example${i + 1}`])), null, 0)}\`\n` +
        `• Named parameters: \`${inputKeys.map((k, i) => `${k}=example${i + 1}`).join(", ")}\`\n` +
        `• Simple values: \`${inputKeys.map((k, i) => `example${i + 1}`).join(", ")}\`\n\n` +
        `📍 Note: If you only provide values for some inputs (e.g., \`var1=value1, var3=value3\`), other defined inputs will be sent as empty strings.`;

      // Update the inputs description
      setInputsDescription(inputsDescriptionText);
    } else {
      // If app has no inputs, set empty placeholder and update description
      setInputsPlaceholder("No input variables required for this app");
      setInputsDescription(
        `📍 ${selectedAppName} doesn't require any input variables. You can leave this field empty.`,
      );
    }
  }, [selectedAppName, apps]);

  // No longer loading last selected app

  // Load app list
  useEffect(() => {
    const loadApps = async () => {
      try {
        // Load all Dify apps
        const appsJson = await LocalStorage.getItem<string>("dify-apps");
        const loadedApps: DifyApp[] = appsJson ? JSON.parse(appsJson) : [];
        // Applications loaded
        setApps(loadedApps);
        setIsLoading(false);

        // Mark apps as loaded
        appsLoadedRef.current = true;

        // After apps are loaded, if there's a preselected app and it exists in the loaded apps list, select it
        if (preselectedAppNameRef.current && loadedApps.some((app) => app.name === preselectedAppNameRef.current)) {
          console.log(`Setting preselected app: ${preselectedAppNameRef.current}`);
          setSelectedAppName(preselectedAppNameRef.current);
        }
        // If there's no preselected app or it doesn't exist, select the first app (if available)
        else if (loadedApps.length > 0 && selectedAppName === "") {
          console.log(`No preselected app, using first app: ${loadedApps[0].name}`);
          setSelectedAppName(loadedApps[0].name);
        }
      } catch (error) {
        console.error("Error loading Dify apps:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error loading Dify apps",
          message: errorMessage,
        });
        setIsLoading(false);
      }
    };

    loadApps();
  }, []);

  // We've already handled preselected app during app loading, no need for these additional useEffects

  // Handle query input change
  function handleQueryInputChange(value: string) {
    setQueryInput(value);
    // Clear error message when typing
    if (queryError && value.trim().length > 0) {
      setQueryError(undefined);
    }
  }

  // Validate query input
  function validateQuery(value: string) {
    if (!value || value.trim().length === 0) {
      setQueryError("Required");
      return false;
    }
    setQueryError(undefined);
    return true;
  }

  // Handle app selection change - only update selectedAppName, don't process inputs
  const handleAppChange = (appName: string) => {
    // Update UI display
    setSelectedAppName(appName);

    // Clear error message
    if (appName) {
      setAppNameError(undefined);

      // Show a toast with information about the selected app
      const app = apps.find((app) => app.name === appName);
      if (app) {
        const hasInputs = app.inputs && Object.keys(app.inputs).length > 0;
        showToast({
          style: Toast.Style.Success,
          title: "App: " + appName,
          message: hasInputs
            ? `has ${Object.keys(app.inputs || {}).length} input variables, check description please`
            : "doesn't require any input variables",
        });
      }
    }
  };

  // Validate app selection
  function validateAppName(value: string) {
    if (!value) {
      setAppNameError("Required");
      return false;
    }
    setAppNameError(undefined);
    return true;
  }

  // We've removed the checkDifyApps function as it's no longer needed

  // Parse inputs with support for JSON, comma-separated values, and Python-style arguments
  const parseInputs = (inputsStr: string, app: DifyApp | null): string => {
    if (!app || !app.inputs) return inputsStr;

    // Get input keys from the app
    const inputKeys = Object.keys(app.inputs);

    // Initialize result with all input keys set to empty strings
    const result: Record<string, string> = {};
    inputKeys.forEach((key) => {
      result[key] = ""; // Default all inputs to empty string
    });

    // If no input string provided, return all inputs with empty values
    if (!inputsStr || inputsStr.trim() === "") {
      return JSON.stringify(result);
    }

    // If it already looks like JSON, parse and validate it
    if (inputsStr.trim().startsWith("{") && inputsStr.trim().endsWith("}")) {
      try {
        // Parse JSON and merge with default empty values
        const parsedJson = JSON.parse(inputsStr);
        // Only keep keys that are defined in the app inputs
        for (const key of inputKeys) {
          if (key in parsedJson) {
            result[key] = String(parsedJson[key]);
          }
          // If key not in parsedJson, it keeps the default empty string
        }
        return JSON.stringify(result);
      } catch (e) {
        // Invalid JSON, will try other formats
        console.log("Invalid JSON format, trying other formats");
      }
    }

    // Check if the input contains any key=value pairs (Python-style named arguments)
    const containsNamedArgs = /\w+\s*=/.test(inputsStr);

    if (containsNamedArgs) {
      // Process Python-style arguments (both positional and named)
      // Split by commas first
      const parts = inputsStr.split(/[,]/).map((part) => part.trim());
      let positionalIndex = 0;

      for (const part of parts) {
        if (part.includes("=")) {
          // Named argument: key=value
          const [key, ...valueParts] = part.split("=");
          const trimmedKey = key.trim();
          const value = valueParts.join("=").trim(); // Handle values that might contain = signs

          // Only set if it's a valid input key
          if (inputKeys.includes(trimmedKey)) {
            result[trimmedKey] = value;
          }
        } else if (part.trim()) {
          // Positional argument
          if (positionalIndex < inputKeys.length) {
            result[inputKeys[positionalIndex]] = part;
            positionalIndex++;
          }
        }
      }
    } else {
      // Simple comma-separated values (positional only)
      const values = inputsStr.split(/[,]/).map((v) => v.trim());

      // Map each value to its corresponding key
      inputKeys.forEach((key, index) => {
        if (index < values.length && values[index]) {
          result[key] = values[index];
        }
        // If no value provided, it keeps the default empty string
      });
    }

    // Always return a JSON string
    return JSON.stringify(result);
  };

  // Handle form submit
  const onSubmitForm = (values: Form.Values) => {
    // Validate required fields
    const isQueryValid = validateQuery(values.input as string);
    const isAppNameValid = validateAppName(values.appName as string);

    if (!isQueryValid || !isAppNameValid) {
      return; // If validation fails, don't submit the form
    }

    // Get the selected app
    const appName = values.appName as string;
    const app = apps.find((a) => a.name === appName) || null;

    // Parse inputs (supporting both JSON and simplified format)
    const rawInputs = values.inputs as string;
    const parsedInputs = parseInputs(rawInputs, app);

    const formValues: FormValues = {
      input: values.input as string,
      appName: appName,
      inputs: parsedInputs,
      user: values.user as string,
    };

    // Simply pass the form values to the parent component
    props.onSubmit(formValues);
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Message} onSubmit={onSubmitForm} title="Ask Dify" />
          <Action
            icon={Icon.Trash}
            title="Clear All"
            onAction={() => {
              // Clear all input fields except Dify App selection
              setInputsValue("");
              prevInputsValueRef.current = "";
              setQueryInput("");

              // Reset any error states
              setQueryError(undefined);
              setAppNameError(undefined);

              // Clear the User ID field if it exists
              if (userIdFieldRef.current) {
                userIdFieldRef.current.reset();
              }

              // Show confirmation toast
              showToast({
                style: Toast.Style.Success,
                title: "All Fields Cleared",
                message: "All input fields have been cleared",
              });
            }}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="input"
        title="Query"
        placeholder="Enter your query here"
        autoFocus
        value={queryInput}
        onChange={handleQueryInputChange}
        error={queryError}
        onBlur={(event) => {
          validateQuery(event.target.value || "");
        }}
        info="Required. This is the initial message you want to send to the Dify application."
      />
      <Form.Dropdown
        id="appName"
        title="Dify App"
        placeholder="Select a Dify app"
        value={selectedAppName}
        error={appNameError}
        info="Required. Select the Dify application you want to interact with. These are the apps you've previously added via 'Add Dify App'."
        onChange={(newValue) => {
          // Only trigger handleAppChange if the value actually changed
          if (newValue !== selectedAppName) {
            handleAppChange(newValue);
          }
        }}
      >
        {apps.map((app) => (
          <Form.Dropdown.Item key={app.name} value={app.name} title={`${app.name} (${getAppTypeText(app.type)})`} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="inputs"
        title="Inputs (Optional)"
        placeholder={inputsPlaceholder}
        value={inputsValue}
        onChange={(newValue) => {
          // Simply update the input value
          setInputsValue(newValue);
          prevInputsValueRef.current = newValue;
        }}
        info={inputsDescription}
      />
      <Form.TextField
        id="user"
        title="User ID (Optional)"
        placeholder="Leave blank to use Raycast_username"
        info="Optional. Identifies you in conversations with Dify. Default uses 'Raycast_' followed by your system username, but you can enter a custom value if needed."
        ref={userIdFieldRef}
      />
    </Form>
  );
}

// Chat view component - second level UI (show conversation details)
function ChatView(props: { formValues: FormValues; conversationId?: string; onContinue: () => void }): JSX.Element {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Store the user ID in a ref to ensure it persists across renders and doesn't change
  const userIdRef = useRef<string>("");
  const [conversations, setConversations] = useState<ChatSession[]>([]);

  // Initialize user ID only once when component mounts
  useEffect(() => {
    // Only set the user ID if it hasn't been set yet
    if (!userIdRef.current) {
      // Use system username as fixed user ID to ensure consistency
      const systemUsername = os.userInfo().username;
      userIdRef.current = props.formValues.user || `Raycast_${systemUsername}`;
      // Initialize user ID with system username
    }
  }, []);
  // We only use setCurrentConversationId when saving new conversations
  const [, setCurrentConversationId] = useState<string | undefined>(props.conversationId);

  // Use ref to track if initial query has been processed
  const initialQueryProcessedRef = useRef(false);

  // Load user settings and conversation history, and process initial query
  useEffect(() => {
    const loadDataAndProcessQuery = async () => {
      try {
        // Load conversation history
        const histories = await getHistories();
        // History loading completed

        // Convert history entries to conversation sessions
        const sessions: ChatSession[] = [];

        // If we have a specific conversation ID, find all entries for that conversation
        if (props.conversationId) {
          // Find all history entries with this conversation ID
          const conversationEntries = histories.filter((h) => h.conversation_id === props.conversationId);
          // Found history for current session

          if (conversationEntries.length > 0) {
            // Sort entries by timestamp (oldest first) to show conversation flow
            const sortedEntries = [...conversationEntries].sort((a, b) => a.timestamp - b.timestamp);

            // Create a single session with all messages from this conversation
            const messages: ChatMessage[] = [];

            // Add all user questions and AI responses as messages
            sortedEntries.forEach((entry) => {
              // Add user message
              messages.push({
                id: `user-${entry.timestamp}`,
                role: "user",
                content: entry.question,
              });

              // Add assistant message
              messages.push({
                id: entry.message_id,
                role: "assistant",
                content: entry.answer,
              });
            });

            // Use the first entry for session metadata
            const firstEntry = sortedEntries[0];

            sessions.push({
              id: props.conversationId,
              messages: messages,
              title: firstEntry.question,
              appName: firstEntry.used_app,
              appType: firstEntry.app_type,
            });
          }
        }

        // Create session from history
        setConversations(sessions);

        // Process initial query if we have one and haven't processed it yet
        if (props.formValues && props.formValues.input && !initialQueryProcessedRef.current) {
          // Process initial query
          initialQueryProcessedRef.current = true;
          await handleInitialQuery();
        } else {
          // No initial query to process or already processed
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error loading data",
          message: errorMessage,
        });
        console.error("Error loading data:", error);
      }
    };

    loadDataAndProcessQuery();
  }, [props.conversationId, props.formValues]);

  // Handle initial query from form values
  const handleInitialQuery = async (): Promise<void> => {
    // Execute initial query processing
    if (!props.formValues || !props.formValues.input) {
      // No form value or empty input, skip initial query
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    try {
      // Parse inputs JSON if provided
      let parsedInputs: Record<string, unknown> = {};
      if (props.formValues.inputs && props.formValues.inputs.trim()) {
        try {
          parsedInputs = JSON.parse(props.formValues.inputs.trim());
          // Input parsing completed
        } catch (e) {
          console.error("Error parsing inputs JSON:", e);
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid Inputs Format",
            message: "Inputs must be a valid JSON object",
          });
          setIsLoading(false);
          initialQueryProcessedRef.current = false; // Reset so we can try again
          return;
        }
      }

      // Get app name and query from form values
      const appName = props.formValues.appName;
      const userQuery = props.formValues.input.trim();

      if (!appName) {
        throw new Error("No app selected. Please select a Dify app.");
      }

      // Get the selected app to access its responseMode
      const selectedApp = await getSelectedApp(appName);

      // Create new user message
      const newUserMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userQuery,
      };

      // Pre-create assistant message showing "typing"
      const pendingAssistantMessageId = `assistant-pending-${Date.now()}`;
      const pendingAssistantMessage: ChatMessage = {
        id: pendingAssistantMessageId,
        role: "assistant",
        content: "[📝 Typing...]",
      };

      // Create a new conversation without a temporary ID
      // We'll set the real ID after receiving the response
      const tempConversation: ChatSession = {
        id: "", // Don't set ID yet, wait for server response
        messages: [newUserMessage, pendingAssistantMessage],
        title: userQuery,
        appName: appName,
        appType: selectedApp?.type,
      };

      // Add the temporary conversation
      setConversations([tempConversation]);
      // Don't set current conversation ID yet, wait for server response
      setCurrentConversationId("");

      // Variables to store streaming response data
      let responseMessage = "";
      let responseConversationId = "";
      let responseMessageId = "";
      let responseAppName = appName;
      let responseAppType = "";
      let response;

      // Use streaming mode if available, otherwise fall back to blocking
      const responseMode = selectedApp?.responseMode || "streaming";
      console.log(`Using responseMode: ${responseMode}`);

      try {
        if (responseMode === "streaming") {
          // Call Dify API with streaming mode
          // Call askDify with JSON string format
          // Define a function to handle streaming messages
          const handleStreamingMessage = (message: string, isComplete: boolean): void => {
            // Update the assistant message with the streaming content
            responseMessage = message;

            // Find the current conversation and update the assistant message
            setConversations((prevConversations) => {
              const updatedConversations = [...prevConversations];
              const currentConversation = updatedConversations[0];

              if (currentConversation) {
                const updatedMessages = [...currentConversation.messages];
                const assistantMessageIndex = updatedMessages.findIndex((m) => m.id === pendingAssistantMessageId);

                if (assistantMessageIndex !== -1) {
                  // Update the content of the assistant message
                  updatedMessages[assistantMessageIndex] = {
                    ...updatedMessages[assistantMessageIndex],
                    content: isComplete ? message : message + "\u258c", // Add cursor when typing
                  };

                  // Update the conversation with the new messages
                  updatedConversations[0] = {
                    ...currentConversation,
                    messages: updatedMessages,
                  };
                }
              }

              return updatedConversations;
            });
          };

          // Create parameter object, but don't include callback function (as it would be serialized)
          const streamingParams = {
            query: userQuery,
            appName: appName,
            inputs: parsedInputs,
            user: userIdRef.current,
            responseMode: "streaming",
          };

          const jsonParams = JSON.stringify(streamingParams);
          console.log("Streaming params:", jsonParams);

          // Create a function to handle streaming messages in the tool command
          // This function will be called inside the tool command, which then calls our handleStreamingMessage
          // We need to set a global callback function before executing the tool command
          // @ts-expect-error - Add global callback function
          global.handleStreamingMessage = handleStreamingMessage;

          // Call askDify and pass callback function
          try {
            // We need to use JSON string to call askDify, as tool commands only accept string parameters
            const responseString = await askDify(jsonParams);

            // Parse response
            if (responseString) {
              const fullResponse = JSON.parse(responseString);

              // Store complete response data
              response = fullResponse;
              responseConversationId = fullResponse.conversation_id || "";
              responseMessageId = fullResponse.message_id || "";
              responseAppName = fullResponse.used_app || appName;
              responseAppType = fullResponse.app_type || "";

              // Set conversation ID after initial streaming response completes
              if (responseConversationId) {
                console.log(`Initial streaming response complete, setting conversation ID: ${responseConversationId}`);
                setCurrentConversationId(responseConversationId);

                // Update conversation ID in the list
                setConversations((prevConversations) => {
                  const updatedConversations = [...prevConversations];
                  if (updatedConversations.length > 0) {
                    updatedConversations[0] = {
                      ...updatedConversations[0],
                      id: responseConversationId,
                      appName: responseAppName,
                      appType: responseAppType,
                    };
                  }
                  return updatedConversations;
                });
              }
            }

            // Clean up global callback function
            // @ts-expect-error - Remove global callback function
            delete global.handleStreamingMessage;
          } catch (error) {
            console.error("Error in streaming API call:", error);
            // Ensure global callback function is cleaned up
            // @ts-expect-error - Remove global callback function
            delete global.handleStreamingMessage;
            throw error;
          }
        } else {
          // Fall back to blocking mode
          // Prepare parameters for the askDify tool command
          const params = {
            query: userQuery,
            appName: appName,
            inputs: parsedInputs,
            user: userIdRef.current,
            responseMode: "blocking",
          };

          // Call the askDify function with JSON string parameter
          const jsonParams = JSON.stringify(params);
          const responseString = await askDify(jsonParams);

          // Parse the response
          response = JSON.parse(responseString);

          // Check if there was an error
          if (response.error) {
            throw new Error(response.error);
          }

          // Set response data
          responseMessage = response.message;
          responseConversationId = response.conversation_id;
          responseMessageId = response.message_id;
          responseAppName = response.used_app || appName;
          responseAppType = response.app_type;

          // Update the assistant message with the response
          setConversations((prevConversations) => {
            const updatedConversations = [...prevConversations];
            const currentConversation = updatedConversations[0];

            if (currentConversation) {
              const updatedMessages = [...currentConversation.messages];
              const assistantMessageIndex = updatedMessages.findIndex((m) => m.id === pendingAssistantMessageId);

              if (assistantMessageIndex !== -1) {
                // Update the content of the assistant message
                updatedMessages[assistantMessageIndex] = {
                  ...updatedMessages[assistantMessageIndex],
                  content: responseMessage,
                };

                // Update the conversation with the new messages
                updatedConversations[0] = {
                  ...currentConversation,
                  messages: updatedMessages,
                };
              }
            }

            return updatedConversations;
          });
        }
      } catch (error) {
        console.error("Error in API response:", error);
        throw error;
      }

      // Finalize the conversation with the complete response
      // Update the conversation with the final data
      const finalConversation: ChatSession = {
        id: responseConversationId,
        messages: [
          // Keep the user message
          newUserMessage,
          // Replace the pending message with the final one
          {
            id: responseMessageId || pendingAssistantMessageId,
            role: "assistant",
            content: responseMessage,
          },
        ],
        title: userQuery,
        appName: responseAppName,
        appType: responseAppType,
      };

      // Only update conversation in non-streaming mode or if streaming response failed
      // In streaming mode, the conversation is updated in real-time via callback function
      if (responseMode !== "streaming" || !responseConversationId) {
        setConversations([finalConversation]);
        // Update conversation ID in non-streaming mode
        setCurrentConversationId(responseConversationId);
        console.log(`Non-streaming mode, updating conversation ID: ${responseConversationId}`);
      } else {
        // In streaming mode, ensure conversation ID has been updated after streaming response completes
        console.log(`Streaming mode completed, conversation ID: ${responseConversationId}`);
      }

      // Save to history
      const historyEntry: DifyHistory = {
        question: userQuery,
        answer: responseMessage,
        timestamp: Date.now(),
        conversation_id: responseConversationId,
        message_id: responseMessageId || pendingAssistantMessageId,
        conversation_text: "", // We don't need this anymore as we're storing structured data
        used_app: responseAppName || appName || "Unknown App",
        app_type: responseAppType,
      };

      // Save session history
      await saveHistory(historyEntry);

      console.log(
        `Query processed successfully by ${responseAppName || appName || "Unknown App"} (${responseAppType ? getAppTypeText(responseAppType as DifyAppType) : "Unknown"})`,
      );
    } catch (error) {
      // Reset the ref if there's an error so we can try again
      initialQueryProcessedRef.current = false;

      // Show error toast with detailed message
      const errorMessage = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error asking Dify",
        message: errorMessage,
      });

      console.error("Error asking Dify:", error);

      // Update the assistant message to show the error
      setConversations((prevConversations) => {
        const updatedConversations = [...prevConversations];
        if (updatedConversations.length > 0) {
          const currentConversation = updatedConversations[0];
          const updatedMessages = [...currentConversation.messages];

          // Find the last assistant message (which should be the pending one)
          const assistantMessageIndex = updatedMessages.findIndex((m) => m.role === "assistant");

          if (assistantMessageIndex !== -1) {
            // Update the content to show the error
            updatedMessages[assistantMessageIndex] = {
              ...updatedMessages[assistantMessageIndex],
              content: `[❌ Error: ${errorMessage}]`,
            };

            // Update the conversation
            updatedConversations[0] = {
              ...currentConversation,
              messages: updatedMessages,
            };
          }
        }
        return updatedConversations;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle new query submission
  const handleSubmit = async (): Promise<void> => {
    const currentQuery = query?.trim();
    if (!currentQuery) return;

    // Handle submission

    setIsLoading(true);
    try {
      // Get app name from form values
      const detectedAppName = props.formValues.appName;
      const processedQuery = currentQuery;

      if (!detectedAppName) {
        throw new Error("No app selected. Please select a Dify app.");
      }

      // Create new user message
      const newUserMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: processedQuery,
      };

      // Pre-create assistant message showing "typing"
      const pendingAssistantMessageId = `assistant-pending-${Date.now()}`;
      const pendingAssistantMessage: ChatMessage = {
        id: pendingAssistantMessageId,
        role: "assistant",
        content: "[📝 Typing...]",
      };

      // Add user message and temporary assistant message to conversation before API response
      // Create or update conversation directly, without async function
      if (conversations.length > 0) {
        // If conversation exists, synchronously update existing conversation
        const updated = [...conversations];
        updated[0] = {
          ...updated[0],
          messages: [...updated[0].messages, newUserMessage, pendingAssistantMessage],
        };
        setConversations(updated);
      } else {
        // If no conversation, synchronously create new one
        // Getting app info can remain async
        const selectedApp = await getSelectedApp(detectedAppName);

        const newConversation: ChatSession = {
          id: "",
          messages: [newUserMessage, pendingAssistantMessage],
          title: processedQuery,
          appName: detectedAppName,
          appType: selectedApp?.type,
          assistantName: selectedApp?.assistantName || detectedAppName,
          responseMode: selectedApp?.responseMode || "blocking",
        };

        // Set conversation directly, don't wait for setState to complete
        setConversations([newConversation]);
      }

      // Force re-render to ensure UI updates
      setTimeout(() => setIsLoading(false), 10);

      // Clear input field so user can immediately enter next query
      setQuery("");

      // IMPORTANT: Only use conversation ID if we have messages in the conversation
      // and we're sure the conversation exists on the server
      // Also ensure conversation_id is a valid UUID
      const hasValidConversation = conversations.length > 0 && conversations[0].messages.length >= 2;

      // Check if ID is a valid UUID
      const isValidUUID = (id: string): boolean => {
        if (!id) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      };

      // Only use ID if it's a valid UUID
      const conversationId = hasValidConversation && isValidUUID(conversations[0].id) ? conversations[0].id : undefined;
      const currentConversationId = conversationId;

      // Log current conversation ID usage
      if (conversationId) {
        console.log(`Using existing conversation ID: ${conversationId}`);
      } else {
        console.log("No valid conversation ID, will create new conversation");
      }

      // Get the selected app to access its responseMode
      const selectedApp = await getSelectedApp(detectedAppName);
      const responseMode = selectedApp?.responseMode || "streaming";
      console.log(`Using responseMode: ${responseMode} for follow-up query`);

      // Variables to store streaming response data
      let responseMessage = "";
      let responseConversationId = currentConversationId || "";
      let responseMessageId = "";
      let responseAppName = detectedAppName;
      let responseAppType = "";
      let response;

      // Parse inputs if provided
      let parsedInputs = {};
      try {
        parsedInputs = props.formValues.inputs ? JSON.parse(props.formValues.inputs) : {};
      } catch (error) {
        console.error("Error parsing inputs:", error);
        // Continue with empty inputs if parsing fails
      }

      try {
        if (responseMode === "streaming") {
          // Call Dify API with streaming mode
          // Call askDify with JSON string format
          // Define a function to handle streaming messages
          const handleStreamingMessage = (message: string, isComplete: boolean): void => {
            // Update the assistant message with the streaming content
            responseMessage = message;

            // Find the current conversation and update the assistant message
            setConversations((prevConversations) => {
              const updatedConversations = [...prevConversations];
              const currentConversation = updatedConversations[0];

              if (currentConversation) {
                const updatedMessages = [...currentConversation.messages];
                const assistantMessageIndex = updatedMessages.findIndex((m) => m.id === pendingAssistantMessageId);

                if (assistantMessageIndex !== -1) {
                  // Update the content of the assistant message
                  updatedMessages[assistantMessageIndex] = {
                    ...updatedMessages[assistantMessageIndex],
                    content: isComplete ? message : message + "\u258c", // Add cursor when typing
                  };

                  // Update the conversation with the new messages
                  updatedConversations[0] = {
                    ...currentConversation,
                    messages: updatedMessages,
                  };
                }
              }

              return updatedConversations;
            });
          };

          // Create parameter object without callback function (as it would be serialized)
          const streamingParams = {
            query: processedQuery,
            appName: detectedAppName,
            inputs: parsedInputs,
            user: userIdRef.current,
            conversationId: currentConversationId,
            responseMode: "streaming",
          };

          // Use modified askDify call
          const jsonParams = JSON.stringify(streamingParams);
          console.log("Streaming params for follow-up:", jsonParams);

          // Create a function to handle streaming messages in the tool command
          // This function will be called inside the tool command, which then calls our handleStreamingMessage
          // We need to set a global callback function before executing the tool command
          // @ts-expect-error - Add global callback function
          global.handleStreamingMessage = handleStreamingMessage;

          // Call askDify and pass callback function
          try {
            // We need to use JSON string to call askDify, as tool commands only accept string parameters
            const responseString = await askDify(jsonParams);

            // Parse response
            if (responseString) {
              const fullResponse = JSON.parse(responseString);

              // Store complete response data
              response = fullResponse;
              responseConversationId = fullResponse.conversation_id || "";
              responseMessageId = fullResponse.message_id || "";
              responseAppName = fullResponse.used_app || detectedAppName;
              responseAppType = fullResponse.app_type || "";
            }

            // Clean up global callback function
            // @ts-expect-error - Remove global callback function
            delete global.handleStreamingMessage;
          } catch (error) {
            console.error("Error in streaming API call:", error);
            // Ensure global callback function is cleaned up
            // @ts-expect-error - Remove global callback function
            delete global.handleStreamingMessage;
            throw error;
          }
        } else {
          // Fall back to blocking mode
          const params = {
            query: processedQuery,
            appName: detectedAppName,
            inputs: parsedInputs,
            user: userIdRef.current,
            // Only include conversationId if we have a valid conversation
            ...(hasValidConversation ? { conversationId: conversations[0].id } : {}),
            responseMode: "blocking",
          };

          // Call the askDify function with JSON string parameter
          const responseString = await askDify(JSON.stringify(params));

          // Parse the response
          response = JSON.parse(responseString);

          // Check if there was an error
          if (response.error) {
            throw new Error(response.error);
          }

          // Set response data
          responseMessage = response.message;
          responseConversationId = response.conversation_id;
          responseMessageId = response.message_id;
          responseAppName = response.used_app || detectedAppName;
          responseAppType = response.app_type;

          // Update the assistant message with the response
          setConversations((prevConversations) => {
            const updatedConversations = [...prevConversations];
            if (updatedConversations.length > 0) {
              const currentConversation = updatedConversations[0];
              const updatedMessages = [...currentConversation.messages];
              const assistantMessageIndex = updatedMessages.findIndex((m) => m.id === pendingAssistantMessageId);

              if (assistantMessageIndex !== -1) {
                // Update the content of the assistant message
                updatedMessages[assistantMessageIndex] = {
                  ...updatedMessages[assistantMessageIndex],
                  content: responseMessage,
                };

                // Update the conversation with the new messages
                updatedConversations[0] = {
                  ...currentConversation,
                  id: responseConversationId, // Update real conversation ID
                  messages: updatedMessages,
                  appName: responseAppName,
                  appType: responseAppType,
                };
              }
            }

            return updatedConversations;
          });
        }
      } catch (error) {
        console.error("Error in API response:", error);
        throw error;
      }

      // Create final assistant message
      const newAssistantMessage: ChatMessage = {
        id: responseMessageId || pendingAssistantMessageId,
        role: "assistant",
        content: responseMessage,
      };

      // Only update conversation in non-streaming mode or if streaming response failed
      // In streaming mode, the conversation is updated in real-time via callback function
      if (responseMode !== "streaming" || !responseConversationId) {
        // Replace temporary assistant message with actual assistant message
        setConversations((prevConversations) => {
          const updated = [...prevConversations];
          if (updated.length > 0) {
            // Remove temporary message, add actual message
            const messages = [...updated[0].messages];
            const assistantMessageIndex = messages.findIndex((m) => m.id === pendingAssistantMessageId);
            if (assistantMessageIndex !== -1) {
              messages[assistantMessageIndex] = newAssistantMessage;
            }

            updated[0] = {
              ...updated[0],
              id: responseConversationId, // Update real conversation ID
              messages: messages,
              appName: responseAppName || updated[0].appName,
              appType: responseAppType || updated[0].appType,
            };
          }
          return updated;
        });

        // Update conversation ID in non-streaming mode
        setCurrentConversationId(responseConversationId);
        console.log(`Follow-up query in non-streaming mode, updating conversation ID: ${responseConversationId}`);
      } else {
        // In streaming mode, ensure conversation ID has been updated after streaming response completes
        console.log(`Follow-up query in streaming mode completed, conversation ID: ${responseConversationId}`);
      }

      // Save to history
      // Create conversation text with conversation rounds
      const conversationText =
        conversations.length > 0
          ? conversations[0].messages
              .map((m, index) => {
                const messageNumber = Math.floor(index / 2) + 1;
                const roundPrefix = m.role === "user" ? `#${messageNumber} ` : "";
                return `${roundPrefix}${m.role === "user" ? "User" : responseAppName || detectedAppName}: ${m.content}`;
              })
              .join("\n\n") +
            "\n\n" +
            `User: ${processedQuery}\n\n${responseAppName || detectedAppName}: ${responseMessage}`
          : `User: ${processedQuery}\n\n${responseAppName || detectedAppName}: ${responseMessage}`;

      const historyEntry: DifyHistory = {
        question: processedQuery,
        answer: responseMessage,
        timestamp: Date.now(),
        conversation_id: responseConversationId,
        message_id: responseMessageId || pendingAssistantMessageId,
        conversation_text: conversationText,
        used_app: responseAppName || detectedAppName || "Unknown App",
        app_type: responseAppType,
        user: userIdRef.current, // Save the current user ID
      };

      await saveHistory(historyEntry);

      // Clear the query input
      setQuery("");
    } catch (error) {
      // Show detailed error information in Toast
      const errorMessage = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error asking Dify",
        message: errorMessage,
      });

      console.error("Error asking Dify:", error);

      // Update assistant message to display error
      setConversations((prevConversations) => {
        const updatedConversations = [...prevConversations];
        if (updatedConversations.length > 0) {
          const currentConversation = updatedConversations[0];
          const updatedMessages = [...currentConversation.messages];

          // Find the last assistant message (the one that is currently being processed)
          const assistantMessageIndex = updatedMessages.findIndex(
            (m) => m.role === "assistant" && (m.content.includes("[📝 Typing...") || m.content.includes("\u258c")),
          );

          if (assistantMessageIndex !== -1) {
            // Update content to display error
            updatedMessages[assistantMessageIndex] = {
              ...updatedMessages[assistantMessageIndex],
              content: `[❌ 错误: ${errorMessage}]`,
            };

            // Update conversation
            updatedConversations[0] = {
              ...currentConversation,
              messages: updatedMessages,
            };
          }
        }
        return updatedConversations;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if a string contains valid JSON
  const containsJson = (text: string): { isJson: boolean; jsonString: string; prefix: string; suffix: string } => {
    // Try to find JSON objects in the text
    const jsonRegex = /\{[\s\S]*?\}/g;
    const matches = text.match(jsonRegex);

    if (!matches) return { isJson: false, jsonString: "", prefix: "", suffix: "" };

    // Try each potential JSON match
    for (const match of matches) {
      try {
        // Check if it's valid JSON by parsing it
        JSON.parse(match);

        // If we get here, it's valid JSON
        // Find the position of the JSON in the original text
        const startIndex = text.indexOf(match);
        const endIndex = startIndex + match.length;

        // Get the text before and after the JSON
        const prefix = text.substring(0, startIndex);
        const suffix = text.substring(endIndex);

        // Make sure the JSON is substantial (not just {} or very small)
        if (match.length > 10) {
          return {
            isJson: true,
            jsonString: match,
            prefix,
            suffix,
          };
        }
      } catch (e) {
        // Not valid JSON, continue to next match
        continue;
      }
    }

    return { isJson: false, jsonString: "", prefix: "", suffix: "" };
  };

  // Format JSON for better display
  const formatJson = (jsonString: string): string => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return jsonString; // Return original if parsing fails
    }
  };

  // Generate Markdown for a single conversation round
  const getRoundMarkdown = (
    userMessage: ChatMessage,
    assistantMessage: ChatMessage,
    roundNumber: number,
    appName: string,
    assistantName?: string,
  ): string => {
    // Check if assistant message contains JSON
    const assistantContent = assistantMessage.content;
    const jsonCheck = containsJson(assistantContent);

    let formattedAssistantContent = assistantContent;

    if (jsonCheck.isJson) {
      // Format the JSON part with code block
      const formattedJson = formatJson(jsonCheck.jsonString);
      formattedAssistantContent = `${jsonCheck.prefix}\n\n\`\`\`json\n${formattedJson}\n\`\`\`\n\n${jsonCheck.suffix}`;
    }

    return `▷ You: ${userMessage.content}\n\n▶ ${assistantName || appName || "Dify"}: ${formattedAssistantContent}`;
  };

  // Group messages into conversation rounds
  const getRounds = (
    conversation: ChatSession,
  ): { user: ChatMessage; assistant: ChatMessage; roundNumber: number }[] => {
    const rounds = [];
    for (let i = 0; i < conversation.messages.length; i += 2) {
      // Ensure messages are paired
      if (i + 1 < conversation.messages.length) {
        const userMessage = conversation.messages[i];
        const assistantMessage = conversation.messages[i + 1];
        // Calculate round number
        const roundNumber = Math.floor(i / 2) + 1;
        rounds.push({ user: userMessage, assistant: assistantMessage, roundNumber });
      }
    }
    return rounds;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type your message..."
      searchText={query}
      onSearchTextChange={setQuery}
      isShowingDetail
      actions={
        <ActionPanel>
          <Action
            icon={Icon.ArrowUp}
            title="Send Message"
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={handleSubmit}
          />
          <Action
            icon={Icon.NewDocument}
            title="New Conversation"
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            onAction={props.onContinue}
          />
        </ActionPanel>
      }
    >
      {conversations.length === 0 ? (
        <List.EmptyView title="No conversation yet" description="Start a conversation by sending a message" />
      ) : (
        // Only process first conversation, as only one can be active at a time
        // Reverse round order to show newest at top
        conversations[0] &&
        getRounds(conversations[0])
          .reverse()
          .map((round) => (
            <List.Item
              key={`${conversations[0].id}-round-${round.roundNumber}`}
              id={`${conversations[0].id}-round-${round.roundNumber}`}
              title={`${round.user.content.substring(0, 60)}${round.user.content.length > 60 ? "..." : ""}`}
              subtitle=""
              accessories={[
                {
                  text: `#${round.roundNumber}`,
                  tooltip: `Round ${round.roundNumber}`,
                  icon: { source: "circle.fill", tintColor: "#AAAAAA" },
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={getRoundMarkdown(
                    round.user,
                    round.assistant,
                    round.roundNumber,
                    conversations[0].appName || "Dify",
                    conversations[0].assistantName,
                  )}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Round"
                        text={`${round.roundNumber} of ${Math.ceil(conversations[0].messages.length / 2)}`}
                      />
                      <List.Item.Detail.Metadata.Label title="App" text={conversations[0].appName || "Unknown"} />
                      <List.Item.Detail.Metadata.TagList title="Type">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={
                            conversations[0].appType
                              ? getAppTypeText(conversations[0].appType as DifyAppType)
                              : "Unknown"
                          }
                          color={
                            conversations[0].appType
                              ? getAppTypeColor(conversations[0].appType as DifyAppType)
                              : "#8E8E93"
                          }
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="User Message"
                        text={round.user.content.substring(0, 100) + (round.user.content.length > 100 ? "..." : "")}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.TagList title="Conversation ID">
                        <List.Item.Detail.Metadata.TagList.Item text={conversations[0].id} color="#FFD60A" />
                      </List.Item.Detail.Metadata.TagList>
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Send New Message"
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={handleSubmit}
                  />
                  <Action.CopyToClipboard
                    title="Copy Response"
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    content={round.assistant.content}
                  />
                  <Action.CopyToClipboard
                    title="Copy Question"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    content={round.user.content}
                  />
                  <Action
                    title="New Conversation"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                    onAction={props.onContinue}
                  />
                </ActionPanel>
              }
            />
          ))
      )}
    </List>
  );
}

// Main command component
export default function Command(props: { conversationId?: string; preselectedAppName?: string }): JSX.Element {
  // Use useRef to track if we've already set form values to prevent double rendering
  const initialRenderRef = useRef(true);
  const [formValues, setFormValues] = useState<FormValues | null>(null);

  // If we have a conversation ID, we'll need some placeholder form values to continue the conversation
  useEffect(() => {
    if (props.conversationId && initialRenderRef.current) {
      // Continue existing session

      // Load history to get the app name for this conversation
      const loadConversationDetails = async () => {
        try {
          // Get all history entries
          const histories = await getHistories();

          // Find the entries for this conversation
          const conversationEntries = histories.filter((h) => h.conversation_id === props.conversationId);

          if (conversationEntries.length > 0) {
            // Sort by timestamp (oldest first)
            const sortedEntries = [...conversationEntries].sort((a, b) => a.timestamp - b.timestamp);

            // Get the app name from the first entry
            const appName = sortedEntries[0].used_app || "";
            // Find application name for the session

            // Get the user ID from history if available, otherwise use system username
            const userId = sortedEntries[0].user || `${os.userInfo().username}`;
            // Find user ID for the session

            // Create placeholder form values with the correct app name and user ID
            const placeholderValues: FormValues = {
              input: "", // This will be ignored as we're continuing a conversation
              appName: appName, // Use the app name from history
              inputs: "{}", // Will be determined from conversation history
              user: userId, // Use the user ID from history
            };

            initialRenderRef.current = false;
            setFormValues(placeholderValues);
          } else {
            console.error(`No history entries found for conversation ID: ${props.conversationId}`);
            // Create placeholder values with empty app name as fallback
            // Use system username as default user ID
            const systemUsername = os.userInfo().username;
            const placeholderValues: FormValues = {
              input: "",
              appName: "",
              inputs: "{}",
              user: systemUsername,
            };

            initialRenderRef.current = false;
            setFormValues(placeholderValues);
          }
        } catch (error) {
          console.error("Error loading conversation details:", error);
          // Create placeholder values with empty app name as fallback
          // Use system username as default user ID
          const systemUsername = os.userInfo().username;
          const placeholderValues: FormValues = {
            input: "",
            appName: "",
            inputs: "{}",
            user: systemUsername,
          };

          initialRenderRef.current = false;
          setFormValues(placeholderValues);
        }
      };

      // Execute the async function
      loadConversationDetails();
    }
  }, [props.conversationId]);

  // Handle form submission
  const handleFormSubmit = (values: FormValues) => {
    // Form submission
    // Validate that we have a query
    if (!values.input || !values.input.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Missing Query",
        message: "Please enter a query to ask Dify",
      });
      return;
    }

    // Only set form values if this is the first time
    if (initialRenderRef.current) {
      // Set form value for initial query
      initialRenderRef.current = false;
      setFormValues(values);
    } else {
      // Form already submitted, ignore subsequent submissions
    }
  };

  // Handle continuing a conversation
  const handleContinue = () => {
    // Reset form values to start a new conversation
    // We don't use the conversation ID anymore as it causes issues with the API
    initialRenderRef.current = true; // Reset the ref so we can submit again
    setFormValues(null);
  };

  // Show form first, then chat view
  // If we have a conversation ID, we'll skip the form and go straight to the chat view
  return (
    <>
      {formValues ? (
        <ChatView formValues={formValues} conversationId={props.conversationId} onContinue={handleContinue} />
      ) : (
        <QueryFormView
          onSubmit={handleFormSubmit}
          conversationId={props.conversationId}
          preselectedAppName={props.preselectedAppName}
        />
      )}
    </>
  );
}
