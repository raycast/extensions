import React, { useState, useEffect, useRef } from "react";
// Add a request ID tracker to prevent duplicate API calls
const processedRequestIds = new Set<string>();
import { Action, ActionPanel, Clipboard, Detail, Form, List, Toast, showToast, LocalStorage, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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
  const [queryInput, setQueryInput] = useState("");
  // Set initial state to empty string to avoid controlled/uncontrolled component switching issues
  const [selectedAppName, setSelectedAppName] = useState("");
  // Store preselected app name reference
  const preselectedAppNameRef = useRef<string | undefined>(props.preselectedAppName);

  // Store dynamic form inputs separately
  const [dynamicInputs, setDynamicInputs] = useState<Record<string, string>>({});
  const [selectedAppType, setSelectedAppType] = useState<DifyAppType | null>(null);

  // Add error states
  const [queryError, setQueryError] = useState<string | undefined>();
  const [appNameError, setAppNameError] = useState<string | undefined>();
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({});

  // Track if apps have been loaded
  const appsLoadedRef = useRef(false);

  // Reference to the user ID field for clearing it
  const userIdFieldRef = useRef<Form.TextField>(null);

  // Initialize dynamic inputs based on selected app
  useEffect(() => {
    // Skip if no app selected or no apps available
    if (!selectedAppName || apps.length === 0) {
      return;
    }

    // Find the selected app
    const app = apps.find((app) => app.name === selectedAppName);

    // Set the app type for conditional rendering
    if (app) {
      setSelectedAppType(app.type as DifyAppType);

      // Initialize dynamic inputs if app has input variables
      if (app.inputs && Object.keys(app.inputs).length > 0) {
        const inputKeys = Object.keys(app.inputs);
        const initialDynamicInputs: Record<string, string> = {};

        // Initialize all inputs with empty strings
        inputKeys.forEach((key) => {
          initialDynamicInputs[key] = "";
        });

        setDynamicInputs(initialDynamicInputs);
      } else {
        // Clear inputs if no input variables
        setDynamicInputs({});
      }
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

  // Validate query input - only needed for Chatflow/Agent apps
  function validateQuery(value: string) {
    // If the app isn't a Chatflow/Agent type, no validation needed
    if (selectedAppType !== DifyAppType.ChatflowAgent) {
      setQueryError(undefined);
      return true;
    }

    // Only validate for Chatflow/Agent type
    if (!value || value.trim().length === 0) {
      setQueryError("Required");
      return false;
    }
    setQueryError(undefined);
    return true;
  }

  // Handle app selection change - update app type and initialize dynamic inputs
  const handleAppChange = (appName: string) => {
    // Update UI display
    setSelectedAppName(appName);

    // Clear error message
    if (appName) {
      setAppNameError(undefined);

      // Find the selected app
      const app = apps.find((app) => app.name === appName);
      if (app) {
        // Set the app type for conditional rendering
        setSelectedAppType(app.type as DifyAppType);

        // Initialize dynamic inputs if app has input variables
        if (app.inputs && Object.keys(app.inputs).length > 0) {
          const inputKeys = Object.keys(app.inputs);
          const initialDynamicInputs: Record<string, string> = {};

          // Initialize all inputs with empty strings
          inputKeys.forEach((key) => {
            initialDynamicInputs[key] = "";
          });

          setDynamicInputs(initialDynamicInputs);
          setInputErrors({});

          // Show a toast with information about the selected app
          showToast({
            style: Toast.Style.Success,
            title: "App: " + appName,
            message: `has ${inputKeys.length} input variables, generated form fields for them`,
          });
        } else {
          // Clear inputs if no input variables
          setDynamicInputs({});
          setInputErrors({});

          showToast({
            style: Toast.Style.Success,
            title: "App: " + appName,
            message: "doesn't require any input variables",
          });
        }
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

  // We've removed the old input parsing functions as they're no longer needed
  // Now we use dynamic form fields with direct input instead

  // Validate individual dynamic input field - now all inputs are optional
  const validateDynamicInput = (key: string): boolean => {
    // All inputs are now optional, so we just clear any previous errors
    setInputErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });

    // Always return true since fields are optional
    return true;
  };

  // Handle form submit
  const onSubmitForm = (values: Form.Values) => {
    // Get the selected app
    const appName = values.appName as string;
    const app = apps.find((a) => a.name === appName) || null;

    // Validate app name selection
    const isAppNameValid = validateAppName(appName);
    if (!isAppNameValid) return;

    // Ensure query is empty string instead of undefined/null
    const queryInput = values.input ? (values.input as string) : "";

    // Check app type to determine validation requirements
    if (app) {
      const appType = app.type as DifyAppType;

      // For Text Generator and Workflow - use dynamic inputs
      if (appType === DifyAppType.TextGenerator || appType === DifyAppType.Workflow) {
        // Validate all dynamic inputs
        let allInputsValid = true;
        const inputKeys = Object.keys(dynamicInputs);

        // Skip validation if no inputs are required
        if (inputKeys.length === 0) {
          // Process form submission with empty inputs
          const formValues: FormValues = {
            input: queryInput, // Allow empty query for these app types
            appName: appName,
            inputs: "{}",
            user: values.user as string,
          };

          props.onSubmit(formValues);
          return;
        }

        // Validate each input field
        for (const key of inputKeys) {
          const isValid = validateDynamicInput(key);
          if (!isValid) allInputsValid = false;
        }

        if (!allInputsValid) return;

        // Format dynamic inputs as JSON
        const formattedInputs = JSON.stringify(dynamicInputs);

        // Create form values
        const formValues: FormValues = {
          input: queryInput, // Allow empty query for these app types
          appName: appName,
          inputs: formattedInputs,
          user: values.user as string,
        };

        // Submit the form
        props.onSubmit(formValues);
      } else {
        // For ChatFlow/Agent - use standard query + inputs form
        // Validate required fields for Chatflow/Agent only
        const isQueryValid = validateQuery(queryInput);

        if (!isQueryValid) return;

        // Also handle dynamic inputs for Chatflow/Agent
        let allInputsValid = true;
        const inputKeys = Object.keys(dynamicInputs);

        // Validate each dynamic input field for Chatflow/Agent
        for (const key of inputKeys) {
          const isValid = validateDynamicInput(key);
          if (!isValid) allInputsValid = false;
        }

        if (!allInputsValid) return;

        // Format dynamic inputs as JSON
        const formattedInputs = JSON.stringify(dynamicInputs);

        const formValues: FormValues = {
          input: values.input as string,
          appName: appName,
          inputs: formattedInputs,
          user: values.user as string,
        };

        // Submit the form
        props.onSubmit(formValues);
      }
    }
  };

  // Handle changes to dynamic input fields
  const handleDynamicInputChange = (key: string, value: string) => {
    setDynamicInputs((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Clear error when user starts typing
    if (inputErrors[key] && value.trim() !== "") {
      setInputErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  // Function to render dynamic input fields based on app inputs
  const renderDynamicInputFields = () => {
    if (!selectedAppName) return null;

    const app = apps.find((app) => app.name === selectedAppName);
    if (!app || !app.inputs || Object.keys(app.inputs).length === 0) {
      return <Form.Description text="This app doesn't require any inputs. You can proceed with submission." />;
    }

    const inputKeys = Object.keys(app.inputs);

    return (
      <>
        {inputKeys.map((key) => (
          <Form.TextArea
            key={key}
            id={`dynamic-input-${key}`}
            title={key}
            placeholder={`Enter value for ${key}`}
            value={dynamicInputs[key] || ""}
            onChange={(value) => handleDynamicInputChange(key, value)}
            error={inputErrors[key]}
            onBlur={() => validateDynamicInput(key)}
            info={`Optional input for ${app.name}. Provide information if needed for better results.`}
          />
        ))}
      </>
    );
  };

  // Clear dynamic inputs
  const clearDynamicInputs = () => {
    // Create new object with same keys but empty values
    const clearedInputs = Object.keys(dynamicInputs).reduce(
      (acc, key) => {
        acc[key] = "";
        return acc;
      },
      {} as Record<string, string>,
    );

    setDynamicInputs(clearedInputs);
    setInputErrors({});
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Message}
            onSubmit={onSubmitForm}
            title={selectedAppType === DifyAppType.ChatflowAgent ? "Ask Dify" : "Submit"}
          />
          <Action
            icon={Icon.Trash}
            title="Clear All"
            onAction={() => {
              // Clear all input fields except Dify App selection
              setQueryInput("");
              clearDynamicInputs();

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

      {/* All app types use dynamic inputs when available */}
      {selectedAppType === DifyAppType.ChatflowAgent ? (
        // For Chatflow/Agent type, show query field and dynamic inputs when needed
        <>
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
          {/* For Chatflow, render dynamic inputs if they exist */}
          {renderDynamicInputFields()}
        </>
      ) : (
        // For Text Generator and Workflow types, show only dynamic input fields
        renderDynamicInputFields()
      )}

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
function ChatView(props: {
  formValues: FormValues;
  conversationId?: string;
  onContinue: () => void;
  initialAppType?: DifyAppType | null;
}): JSX.Element {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Add a ref to track the last submission timestamp to prevent duplicates
  const lastSubmissionTimeRef = useRef<number>(0);
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

    // Reset the lastSubmissionTimeRef when component mounts to prevent
    // any stale debounce values from previous sessions
    lastSubmissionTimeRef.current = 0;
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

            // If we have an initialAppType from props, use it instead of the one from history
            // This ensures consistency with what was passed from the history view
            const appType = props.initialAppType || firstEntry.app_type;
            console.log(`Using app type for conversation: ${appType}`);

            sessions.push({
              id: props.conversationId,
              messages: messages,
              title: firstEntry.question,
              appName: firstEntry.used_app,
              appType: appType,
            });
          }
        }

        // Create session from history
        setConversations(sessions);

        // Process initial query if we have form values and haven't processed it yet
        if (props.formValues && !initialQueryProcessedRef.current) {
          // Check if we should process with empty query
          const shouldProcess = async () => {
            if (props.formValues.input) {
              // If we have input, always process
              return true;
            }

            // If no input, check app type to determine if we should process
            try {
              const appName = props.formValues.appName;
              const selectedApp = await getSelectedApp(appName);
              const appType = selectedApp?.type as DifyAppType;

              // Allow empty queries for TextGenerator and Workflow
              if (appType === DifyAppType.TextGenerator || appType === DifyAppType.Workflow) {
                console.log(`Allowing empty query for app type: ${appType}`);
                return true;
              }

              // For other app types, require input
              return false;
            } catch (error) {
              console.error("Error checking app type in shouldProcess:", error);
              return false; // Be conservative if we can't determine app type
            }
          };

          // Check if we should process and do so if needed
          const shouldProcessResult = await shouldProcess();
          if (shouldProcessResult) {
            console.log(`Processing initial query (empty query allowed)`);
            // Set the flag before processing to prevent duplicate requests
            initialQueryProcessedRef.current = true;
            try {
              await handleInitialQuery();
            } catch (error) {
              // Reset the ref if there's an error so we can try again
              initialQueryProcessedRef.current = false;
              const errorMessage = error instanceof Error ? error.message : String(error);
              showFailureToast({
                title: "Error processing initial query",
                message: errorMessage,
              });
              console.error("Error in handleInitialQuery:", error);
            }
          } else {
            // Not processing initial query because shouldProcess returned false
            console.log(`Not processing empty query for this app type (shouldProcess returned false)`);
          }
        } else {
          // Not processing initial query
          if (initialQueryProcessedRef.current) {
            console.log(`Initial query already processed`);
          } else if (!props.formValues) {
            console.log(`No form values available, can't process initial query`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        showFailureToast({
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
    // Check if we're already processing a request to prevent duplicate submissions
    if (isLoading) {
      console.log("Already processing a request, ignoring duplicate initial query");
      return;
    }

    // Generate a unique request ID based on form values and timestamp
    const requestId = `initial_${props.formValues?.appName || "unknown"}_${Date.now()}`;

    // Check if this request has already been processed
    if (processedRequestIds.has(requestId.split("_").slice(0, 2).join("_"))) {
      console.log(`Request for app ${props.formValues?.appName} already being processed, skipping duplicate`);
      return;
    }

    // Add request ID to processed set
    processedRequestIds.add(requestId.split("_").slice(0, 2).join("_"));
    console.log(`Processing initial query with request ID: ${requestId}`);

    // Add debounce mechanism for initial query similar to handleSubmit
    const now = Date.now();
    const timeSinceLastSubmission = now - lastSubmissionTimeRef.current;

    // Check if this is a TextGenerator app type
    let isTextGenerator = false;
    if (props.formValues?.appName) {
      try {
        const selectedApp = await getSelectedApp(props.formValues.appName);
        isTextGenerator = selectedApp?.type === DifyAppType.TextGenerator;
        if (isTextGenerator) {
          console.log("Detected TextGenerator app type for initial query");

          // TextGenerator apps need stricter debounce (2000ms)
          if (timeSinceLastSubmission < 2000) {
            console.log(
              `Prevented duplicate TextGenerator initial query: ${timeSinceLastSubmission}ms since last submission`,
            );
            // Remove from processed set since we're not proceeding
            processedRequestIds.delete(requestId.split("_").slice(0, 2).join("_"));
            return;
          }
        } else if (timeSinceLastSubmission < 1000) {
          // For other app types, use a shorter debounce (1000ms)
          console.log(`Prevented duplicate initial query: ${timeSinceLastSubmission}ms since last submission`);
          // Remove from processed set since we're not proceeding
          processedRequestIds.delete(requestId.split("_").slice(0, 2).join("_"));
          return;
        }
      } catch (error) {
        console.error("Error checking app type for initial query:", error);
        // Remove from processed set on error
        processedRequestIds.delete(requestId.split("_").slice(0, 2).join("_"));
      }
    }

    // Update the submission timestamp
    lastSubmissionTimeRef.current = now;

    // Execute initial query processing
    if (!props.formValues) {
      // No form values at all, skip processing
      setIsLoading(false);
      return;
    }

    // Get app name and determine app type
    const appName = props.formValues.appName;

    // Set loading state early
    setIsLoading(true);

    // Log that we're starting to process the initial query
    console.log(`Processing initial query for app: ${appName}`);

    try {
      // Get app details to check app type
      const selectedApp = await getSelectedApp(appName);
      const appType = selectedApp?.type as DifyAppType;

      console.log(`App type determined: ${appType}`);

      // For ChatflowAgent, require a query
      if (appType === DifyAppType.ChatflowAgent && (!props.formValues.input || !props.formValues.input.trim())) {
        console.log("Empty query not allowed for ChatflowAgent app");
        await showToast({
          style: Toast.Style.Failure,
          title: "Empty Query",
          message: "Please provide a query for Chatflow/Agent apps",
        });
        props.onContinue(); // Go back to form
        setIsLoading(false);
        return;
      }

      // For TextGenerator and Workflow, empty query is allowed
      // Ensure input is at least an empty string (not undefined/null)
      if (!props.formValues.input && (appType === DifyAppType.TextGenerator || appType === DifyAppType.Workflow)) {
        console.log(`Empty query allowed for app type: ${appType}`);
        // Set input to empty string to avoid null/undefined errors
        props.formValues.input = "";
      }
    } catch (error) {
      console.error("Error checking app type:", error);
      // If we can't determine the app type, be conservative and require a query
      if (!props.formValues.input || !props.formValues.input.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Input Error",
          message: "Please provide a query",
        });
        props.onContinue(); // Go back to form
        setIsLoading(false);
        return;
      }
    }

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

            console.log(`Streaming message received: ${message.length} chars, isComplete: ${isComplete}`);

            // Find the current conversation and update the assistant message
            setConversations((prevConversations) => {
              const updatedConversations = [...prevConversations];
              const currentConversation = updatedConversations[0];

              if (currentConversation) {
                const updatedMessages = [...currentConversation.messages];
                const assistantMessageIndex = updatedMessages.findIndex((m) => m.id === pendingAssistantMessageId);

                if (assistantMessageIndex !== -1) {
                  // Update the content of the assistant message
                  // Only add cursor when not complete
                  const displayContent = isComplete ? message : message + "\u258c";

                  updatedMessages[assistantMessageIndex] = {
                    ...updatedMessages[assistantMessageIndex],
                    content: displayContent,
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

          // Generate a unique callback ID for this streaming session
          const callbackId = `cb_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

          // Create parameter object, but don't include callback function (as it would be serialized)
          const streamingParams = {
            query: userQuery,
            appName: appName,
            inputs: parsedInputs,
            user: userIdRef.current,
            responseMode: "streaming",
            callbackId: callbackId, // Add the callback ID to the parameters
          };

          const jsonParams = JSON.stringify(streamingParams);
          console.log("Streaming params:", jsonParams);

          // Set up an event listener to handle streaming messages
          const eventKey = `dify_streaming_${callbackId}`;
          const checkForStreamingEvents = async () => {
            try {
              const eventData = await LocalStorage.getItem<string>(eventKey);
              if (eventData) {
                // Parse the event data
                const { message, isComplete } = JSON.parse(eventData);

                console.log(`Event data received: message length ${message.length}, isComplete: ${isComplete}`);

                // Process the streaming message
                handleStreamingMessage(message, isComplete);

                // If the message is complete, wait a bit before cleaning up
                // This ensures the final message is fully rendered
                if (isComplete) {
                  console.log("Stream marked as complete, cleaning up resources");

                  // Delay cleanup to ensure rendering completes
                  setTimeout(async () => {
                    clearInterval(eventCheckInterval);
                    // Clean up the event data
                    await LocalStorage.removeItem(eventKey);
                    console.log("Event listener and data cleaned up");
                  }, 200);
                }
              }
            } catch (error) {
              console.error("Error checking for streaming events:", error);
            }
          };

          // Check for events every 50ms for more responsive streaming
          const eventCheckInterval = setInterval(checkForStreamingEvents, 50);

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

            // Clean up the event listener
            clearInterval(eventCheckInterval);
            await LocalStorage.removeItem(eventKey);
          } catch (error) {
            console.error("Error in streaming API call:", error);
            // Ensure event listener is cleaned up
            clearInterval(eventCheckInterval);
            await LocalStorage.removeItem(eventKey);
            throw error;
          }
        } else {
          // Fall back to blocking mode
          // Prepare parameters for the askDify tool command
          const params: {
            query: string;
            appName: string;
            user: string;
            responseMode: string;
            inputs?: Record<string, unknown>;
          } = {
            query: userQuery,
            appName: appName,
            user: userIdRef.current,
            responseMode: "blocking",
          };

          // Only add inputs if they are provided
          if (parsedInputs && Object.keys(parsedInputs).length > 0) {
            params.inputs = parsedInputs;
            console.log("Adding inputs to initial blocking request:", parsedInputs);
          } else {
            console.log("No inputs to add to initial blocking request");
          }

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
      showFailureToast({
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
      // Clean up request ID for this app
      const appName = props.formValues?.appName || "unknown";
      processedRequestIds.delete(`initial_${appName}`);
      processedRequestIds.delete(`submit_${appName}`);
      console.log(`Cleaned up request IDs for app: ${appName}`);
    }
  };

  // Handle new query submission
  const handleSubmit = async (): Promise<void> => {
    // First check if loading to avoid any unnecessary processing
    if (isLoading) {
      console.log("Already processing a request, ignoring duplicate submission");
      return;
    }

    // Generate a unique request ID based on query and timestamp
    const appName = props.formValues?.appName || (conversations.length > 0 ? conversations[0]?.appName : "unknown");
    const requestId = `submit_${appName}_${Date.now()}`;

    // Check if this request has already been processed
    if (processedRequestIds.has(requestId.split("_").slice(0, 2).join("_"))) {
      console.log(`Request for app ${appName} already being processed, skipping duplicate submission`);
      return;
    }

    // Add request ID to processed set
    processedRequestIds.add(requestId.split("_").slice(0, 2).join("_"));
    console.log(`Processing submission with request ID: ${requestId}`);

    // Enhanced debounce mechanism to prevent duplicate submissions
    const now = Date.now();
    const timeSinceLastSubmission = now - lastSubmissionTimeRef.current;
    const isTextGenerator = conversations.length > 0 && conversations[0]?.appType === DifyAppType.TextGenerator;

    // Get app name from form values to check if it's a text generator
    // This is needed for the initial submission when conversations array is empty
    let isTextGeneratorByAppName = false;
    if (!isTextGenerator && props.formValues?.appName) {
      try {
        const selectedApp = await getSelectedApp(props.formValues.appName);
        isTextGeneratorByAppName = selectedApp?.type === DifyAppType.TextGenerator;
        if (isTextGeneratorByAppName) {
          console.log("Detected TextGenerator app type from app name");
        }
      } catch (error) {
        console.error("Error checking app type:", error);
        // Remove from processed set on error
        processedRequestIds.delete(requestId.split("_").slice(0, 2).join("_"));
      }
    }

    // TextGenerator apps are especially prone to double submission on Cmd+Enter key
    // Apply a stricter debounce (2000ms) specifically for TextGenerator
    if ((isTextGenerator || isTextGeneratorByAppName) && timeSinceLastSubmission < 2000) {
      console.log(`Prevented duplicate TextGenerator submission: ${timeSinceLastSubmission}ms since last submission`);
      // Remove from processed set since we're not proceeding
      processedRequestIds.delete(requestId.split("_").slice(0, 2).join("_"));
      return;
    } else if (!isTextGenerator && !isTextGeneratorByAppName && timeSinceLastSubmission < 1000) {
      // For other app types, use a shorter debounce (1000ms)
      console.log(`Prevented duplicate submission: ${timeSinceLastSubmission}ms since last submission`);
      // Remove from processed set since we're not proceeding
      processedRequestIds.delete(requestId.split("_").slice(0, 2).join("_"));
      return;
    }

    // Update the submission timestamp
    lastSubmissionTimeRef.current = now;

    const currentQuery = query ? query.trim() : "";

    // Check if we should proceed with an empty query
    if (!currentQuery) {
      // Get app name from form values and check current conversation's app type
      const appName = props.formValues?.appName;
      if (!appName) {
        // Can't determine app type without app name
        return;
      }

      // Also check if the current conversation is of a non-conversational type
      if (conversations.length > 0) {
        const currentAppType = conversations[0]?.appType as DifyAppType;

        // If this is a TextGenerator or Workflow type, don't allow new messages
        if (currentAppType === DifyAppType.TextGenerator || currentAppType === DifyAppType.Workflow) {
          console.log(`Can't send new message for non-conversational app type: ${currentAppType}`);
          showToast({
            style: Toast.Style.Failure,
            title: "Not supported",
            message: "TextGenerator and Workflow apps don't support continuous conversation",
          });
          return;
        }
      }

      try {
        // Get app details to check app type
        const selectedApp = await getSelectedApp(appName);
        const appType = selectedApp?.type as DifyAppType;

        // Only allow empty queries for TextGenerator and Workflow
        if (appType !== DifyAppType.TextGenerator && appType !== DifyAppType.Workflow) {
          console.log("Empty query not allowed for this app type: " + appType);
          return;
        }

        console.log(`Empty query allowed for app type: ${appType}, proceeding with submission`);
        // For these app types, we can proceed with empty query
      } catch (error) {
        console.error("Error checking app type:", error);
        // If we can't determine app type, be conservative and don't proceed with empty query
        return;
      }
    }

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

            console.log(`Streaming message received: ${message.length} chars, isComplete: ${isComplete}`);

            // Find the current conversation and update the assistant message
            setConversations((prevConversations) => {
              const updatedConversations = [...prevConversations];
              const currentConversation = updatedConversations[0];

              if (currentConversation) {
                const updatedMessages = [...currentConversation.messages];
                const assistantMessageIndex = updatedMessages.findIndex((m) => m.id === pendingAssistantMessageId);

                if (assistantMessageIndex !== -1) {
                  // Update the content of the assistant message
                  // Only add cursor when not complete
                  const displayContent = isComplete ? message : message + "\u258c";

                  updatedMessages[assistantMessageIndex] = {
                    ...updatedMessages[assistantMessageIndex],
                    content: displayContent,
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

          // Generate a unique callback ID for this streaming session
          const callbackId = `cb_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

          // Create parameter object without callback function (as it would be serialized)
          const streamingParams = {
            query: processedQuery,
            appName: detectedAppName,
            inputs: parsedInputs,
            user: userIdRef.current,
            conversationId: currentConversationId,
            responseMode: "streaming",
            callbackId: callbackId, // Add the callback ID to the parameters
          };

          // Use modified askDify call
          const jsonParams = JSON.stringify(streamingParams);
          console.log("Streaming params for follow-up:", jsonParams);

          // Set up an event listener to handle streaming messages
          const eventKey = `dify_streaming_${callbackId}`;
          const checkForStreamingEvents = async () => {
            try {
              const eventData = await LocalStorage.getItem<string>(eventKey);
              if (eventData) {
                // Parse the event data
                const { message, isComplete } = JSON.parse(eventData);

                console.log(`Event data received: message length ${message.length}, isComplete: ${isComplete}`);

                // Process the streaming message
                handleStreamingMessage(message, isComplete);

                // If the message is complete, wait a bit before cleaning up
                // This ensures the final message is fully rendered
                if (isComplete) {
                  console.log("Stream marked as complete, cleaning up resources");

                  // Delay cleanup to ensure rendering completes
                  setTimeout(async () => {
                    clearInterval(eventCheckInterval);
                    // Clean up the event data
                    await LocalStorage.removeItem(eventKey);
                    console.log("Event listener and data cleaned up");
                  }, 200);
                }
              }
            } catch (error) {
              console.error("Error checking for streaming events:", error);
            }
          };

          // Check for events every 50ms for more responsive streaming
          const eventCheckInterval = setInterval(checkForStreamingEvents, 50);

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

            // Clean up the event listener
            clearInterval(eventCheckInterval);
            await LocalStorage.removeItem(eventKey);
          } catch (error) {
            console.error("Error in streaming API call:", error);
            // Ensure event listener is cleaned up
            clearInterval(eventCheckInterval);
            await LocalStorage.removeItem(eventKey);
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
              content: `[❌ Error: ${errorMessage}]`,
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
      // Clean up request ID for this app
      const appName = props.formValues?.appName || "unknown";
      processedRequestIds.delete(`initial_${appName}`);
      processedRequestIds.delete(`submit_${appName}`);
      console.log(`Cleaned up request IDs for app: ${appName}`);
    }
  };

  // Check if a string contains valid JSON
  const containsJson = (text: string): { isJson: boolean; jsonString: string; prefix: string; suffix: string } => {
    // Ensure text is defined before trying to match
    if (!text) return { isJson: false, jsonString: "", prefix: "", suffix: "" };

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
    // Check if this is a non-conversational app type
    const isNonConversational =
      conversations.length > 0 &&
      (conversations[0]?.appType === DifyAppType.TextGenerator || conversations[0]?.appType === DifyAppType.Workflow);

    // Check if assistant message contains JSON
    const assistantContent = assistantMessage.content;
    const jsonCheck = containsJson(assistantContent);

    let formattedAssistantContent = assistantContent;

    if (jsonCheck.isJson) {
      // Format the JSON part with code block
      const formattedJson = formatJson(jsonCheck.jsonString);
      formattedAssistantContent = `${jsonCheck.prefix}\n\n\`\`\`json\n${formattedJson}\n\`\`\`\n\n${jsonCheck.suffix}`;
    }

    // Process Markdown line breaks correctly
    // Replace all line breaks with double line breaks to ensure proper rendering
    formattedAssistantContent = formattedAssistantContent
      .replace(/\n/g, "\n\n")
      .replace(/\n\n\n\n/g, "\n\n") // Prevent excessive line breaks
      .replace(/\n\n```/g, "\n```"); // Fix code blocks formatting

    if (isNonConversational) {
      // For TextGenerator and Workflow, show only the API result without the input
      return formattedAssistantContent;
    } else {
      // For conversational apps (ChatflowAgent), use the regular chat layout
      return `▷ You: ${userMessage.content}\n\n▶ ${assistantName || appName || "Dify"}: ${formattedAssistantContent}`;
    }
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

  // Determine if we're displaying a conversational app (ChatflowAgent) or non-conversational app (TextGenerator/Workflow)
  const isConversationalApp = (): boolean => {
    if (conversations.length === 0) return true; // Default to true if no conversation yet

    const appType = conversations[0]?.appType as DifyAppType;
    // If app type is explicitly set to TextGenerator or Workflow, return false
    // Otherwise default to true (for ChatflowAgent or if appType is undefined)
    return appType !== DifyAppType.TextGenerator && appType !== DifyAppType.Workflow;
  };

  // Non-conversational apps now use a standalone Detail view

  // For non-conversational apps, use a standalone Detail view without the list
  if (!isConversationalApp() && conversations.length > 0) {
    // Get the first round which has the user query and the AI response
    const rounds = getRounds(conversations[0]);
    if (rounds.length > 0) {
      const round = rounds[0];

      // Create a standalone Detail view for TextGenerator and Workflow app types
      return (
        <Detail
          navigationTitle={conversations[0].appName || "Dify Response"}
          markdown={getRoundMarkdown(
            round.user,
            round.assistant,
            1,
            conversations[0].appName || "Dify",
            conversations[0].assistantName,
          )}
          metadata={
            <Detail.Metadata>
              <Detail.Metadata.Label title="App" text={conversations[0].appName || "Unknown"} />
              <Detail.Metadata.TagList title="Type">
                <Detail.Metadata.TagList.Item
                  text={getAppTypeText(conversations[0].appType as DifyAppType)}
                  color={getAppTypeColor(conversations[0].appType as DifyAppType)}
                />
              </Detail.Metadata.TagList>
            </Detail.Metadata>
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Response"
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                content={round.assistant.content}
              />
              <Action
                title="New Conversation"
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                onAction={props.onContinue}
              />
              <Action.OpenInBrowser
                title="Learn About This App Type"
                shortcut={{ modifiers: ["cmd"], key: "h" }}
                url="https://docs.dify.ai/features/app-types"
              />
            </ActionPanel>
          }
        />
      );
    }
  }

  // Regular List view for conversational apps
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={isConversationalApp() ? "Type your message..." : undefined}
      searchText={isConversationalApp() ? query : ""}
      onSearchTextChange={isConversationalApp() ? setQuery : undefined}
      isShowingDetail
      searchBarAccessory={
        isConversationalApp() ? undefined : (
          <List.Dropdown tooltip="This is a non-conversational app type" storeValue={false} onChange={() => {}}>
            <List.Dropdown.Item title="TextGenerator/Workflow - View only mode" value="info" />
          </List.Dropdown>
        )
      }
      actions={
        <ActionPanel>
          {isConversationalApp() && (
            <Action
              icon={Icon.ArrowUp}
              title="Send Message"
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={handleSubmit}
            />
          )}
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
                      {/* For non-conversational apps, show a different layout */}
                      {/* Removed redundant '(Non-conversational)' label as the app type is already shown in the regular type field */}

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
                  {/* Only show "Send New Message" for conversational app types */}
                  {conversations[0]?.appType === DifyAppType.ChatflowAgent && (
                    <Action
                      title="Send New Message"
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      onAction={handleSubmit}
                    />
                  )}

                  {/* For non-conversational app types, show fullscreen toggle as primary action */}
                  {(conversations[0]?.appType === DifyAppType.TextGenerator ||
                    conversations[0]?.appType === DifyAppType.Workflow) && (
                    <Action
                      title="Copy as Markdown"
                      shortcut={{ modifiers: ["cmd"], key: "m" }}
                      onAction={() => {
                        // Create markdown content that combines input and response
                        const markdownContent = `# Response from ${conversations[0].appName || "Dify"}\n\n${round.assistant.content}\n\n---\n\n### Input:\n${round.user.content}`;

                        // Copy to clipboard
                        Clipboard.copy(markdownContent);

                        // Show toast
                        showToast({
                          style: Toast.Style.Success,
                          title: "Copied as Markdown",
                          message: "Response copied in full markdown format",
                        });
                      }}
                    />
                  )}

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

                  {/* For non-conversational app types, add a help action */}
                  {(conversations[0]?.appType === DifyAppType.TextGenerator ||
                    conversations[0]?.appType === DifyAppType.Workflow) && (
                    <Action.OpenInBrowser
                      title="Learn About This App Type"
                      shortcut={{ modifiers: ["cmd"], key: "h" }}
                      url="https://docs.dify.ai/features/app-types"
                    />
                  )}
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
  const [initialAppType, setInitialAppType] = useState<DifyAppType | null>(null);

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

            // Get the app type from the first entry and store it in state
            const appType = sortedEntries[0].app_type as DifyAppType;
            if (appType) {
              console.log(`Setting initial app type: ${appType} for conversation: ${props.conversationId}`);
              setInitialAppType(appType);
            }

            // Get the user ID from history if available, otherwise use system username
            const userId = sortedEntries[0].user || `${os.userInfo().username}`;

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

  // Track the last form submission timestamp to prevent duplicates
  const lastSubmissionTimeRef = React.useRef<number>(0);

  // Handle form submission with enhanced debounce protection
  const handleFormSubmit = async (values: FormValues) => {
    // Generate a unique request ID for this form submission
    const requestId = `form_${values.appName || "unknown"}_${Date.now()}`;

    // Check if this request has already been processed
    if (processedRequestIds.has(requestId.split("_").slice(0, 2).join("_"))) {
      console.log(`Form for app ${values.appName} already being processed, skipping duplicate`);
      return;
    }

    // Add request ID to processed set
    processedRequestIds.add(requestId.split("_").slice(0, 2).join("_"));

    // Prevent duplicate submissions by checking time since last submission
    const now = Date.now();
    const timeSinceLastSubmission = now - lastSubmissionTimeRef.current;

    // If less than 2000ms since last submission, ignore this submission
    if (timeSinceLastSubmission < 2000) {
      console.log(`Ignoring duplicate submission (${timeSinceLastSubmission}ms since last submission)`);
      // Remove from processed set since we're not proceeding
      processedRequestIds.delete(requestId.split("_").slice(0, 2).join("_"));
      return;
    }

    // Update last submission time
    lastSubmissionTimeRef.current = now;
    console.log(`Form submission at ${now}, app: ${values.appName}`);

    // Get app name to determine app type and validation requirements
    const appName = values.appName;

    try {
      // Check app type to determine if empty query is allowed
      const selectedApp = await getSelectedApp(appName);
      const appType = selectedApp?.type as DifyAppType;

      // Only require query for ChatflowAgent type
      if (appType === DifyAppType.ChatflowAgent && (!values.input || !values.input.trim())) {
        showToast({
          style: Toast.Style.Failure,
          title: "Missing Query",
          message: "Please enter a query for Chatflow/Agent apps",
        });
        lastSubmissionTimeRef.current = 0; // Reset submission time to allow retry
        return;
      }

      // For TextGenerator and Workflow types, query is optional - proceed without validation
      if (
        (appType === DifyAppType.TextGenerator || appType === DifyAppType.Workflow) &&
        (!values.input || !values.input.trim())
      ) {
        console.log(`Empty query allowed for app type: ${appType}`);
      }
    } catch (error) {
      console.error("Error determining app type:", error);
      // If we can't determine the app type, fall back to validating the query
      if (!values.input || !values.input.trim()) {
        showToast({
          style: Toast.Style.Failure,
          title: "Missing Query",
          message: "Please enter a query to ask Dify",
        });
        lastSubmissionTimeRef.current = 0; // Reset submission time to allow retry
        return;
      }
    }

    // Only set form values if this is the first time
    if (initialRenderRef.current) {
      // Set form value for initial query
      initialRenderRef.current = false;
      setFormValues(values);

      // Clean up request ID for this app
      processedRequestIds.delete(`form_${values.appName}`);
      console.log(`Cleaned up form request ID for app: ${values.appName}`);
    } else {
      // Form already submitted, ignore subsequent submissions
      console.log("Form already submitted, ignoring subsequent submission");
      // Clean up request ID for this app
      processedRequestIds.delete(`form_${values.appName}`);
      console.log(`Cleaned up form request ID for app: ${values.appName}`);
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
        <ChatView
          formValues={formValues}
          conversationId={props.conversationId}
          onContinue={handleContinue}
          initialAppType={initialAppType}
        />
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
