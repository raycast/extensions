import {
  ActionPanel,
  Icon,
  List,
  Action,
  confirmAlert,
  showToast,
  Toast,
  LocalStorage,
  Detail,
  Form,
  useNavigation,
  Alert,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { DifyAppType, DifyApp, DifyConversationType, getAppTypeText, getAppTypeColor } from "./utils/types";
import AskDifyCommand from "./ask-dify";

// Helper function to get icon based on app type (local override)
function getAppIconForList(type: DifyAppType): Icon {
  switch (type) {
    case DifyAppType.ChatflowAgent:
      return Icon.SpeechBubbleActive;
    case DifyAppType.Workflow:
      return Icon.BulletPoints;
    case DifyAppType.TextGenerator:
      return Icon.Paragraph;
    default:
      return Icon.SpeechBubbleActive;
  }
}

// App detail view component
function AppDetailView(props: { app: DifyApp }) {
  const { app } = props;

  const formatInputs = (inputs: Record<string, unknown>): string => {
    if (!inputs || Object.keys(inputs).length === 0) {
      return "None";
    }

    return JSON.stringify(inputs, null, 2);
  };

  // Get the app type text for display
  const typeDisplayText = getAppTypeText(app.type || DifyAppType.ChatflowAgent);

  const markdown = `# ${app.name}

## Configuration Details

| Property | Value |
| -------- | ----- |
| **Type** | ${typeDisplayText} |
| **Endpoint** | \`${app.endpoint}\` |
| **API Key** | \`${app.apiKey.substring(0, 4)}...${app.apiKey.substring(app.apiKey.length - 4)}\` |
| **Assistant Name** | ${app.assistantName || "Not set"} |
| **Response Mode** | ${app.responseMode || "blocking"} |
| **Wait Mode** | ${app.waitForResponse === false ? "Non-Wait Mode (Only check API call success)" : "Wait Mode (Wait for full response)"} |
| **Conversation Type** | ${app.conversationType === DifyConversationType.SingleCall ? "Single Call (No conversation tracking)" : "Continuous (Track conversation history)"} |

## Description

${app.description || "No description provided."}

## Input Parameters

\`\`\`json
${formatInputs(app.inputs)}
\`\`\`



---

*Created: ${app.createdAt || `${new Date().toISOString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`}*  
*Last updated: ${app.updatedAt || `${new Date().toISOString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`}*`;

  return <Detail markdown={markdown} />;
}

// Edit Dify App Form component
function EditDifyAppForm(props: { app: DifyApp; onEdit: () => void }) {
  const { app, onEdit } = props;
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [endpointError, setEndpointError] = useState<string | undefined>();
  const [apiKeyError, setApiKeyError] = useState<string | undefined>();
  const [appType, setAppType] = useState<DifyAppType>(app.type || DifyAppType.ChatflowAgent);
  const [responseMode, setResponseMode] = useState<string>(app.responseMode || "blocking");
  const [waitForResponse, setWaitForResponse] = useState<boolean>(app.waitForResponse !== false);
  const [conversationType, setConversationType] = useState<DifyConversationType>(
    app.conversationType || DifyConversationType.Continuous,
  );

  // Handle form submission
  const handleSubmit = async (values: {
    name: string;
    endpoint: string;
    apiKey: string;
    inputs: string;
    assistantName: string;
    description: string;
  }) => {
    // Validate form
    if (!values.name) {
      setNameError("Name is required");
      return;
    }
    if (!values.endpoint) {
      setEndpointError("Endpoint is required");
      return;
    }
    if (!values.apiKey) {
      setApiKeyError("API Key is required");
      return;
    }

    try {
      // Parse inputs from comma-separated values
      const parsedInputs: Record<string, string> = {};
      if (values.inputs && values.inputs.trim().length > 0) {
        // First try to split by comma (both English and Chinese commas)
        const inputText = values.inputs.trim();
        let inputFields: string[];

        if (inputText.match(/[,，]/)) {
          // If commas are present, split by them
          inputFields = inputText.split(/[,，]/).map((field) => field.trim());
        } else {
          // If no commas, treat each word as a separate field
          inputFields = inputText.split(/\s+/);
        }

        // Create an object with each field as a key with empty string value
        inputFields.forEach((field) => {
          if (field) {
            parsedInputs[field] = "";
          }
        });
      }

      // Get existing apps
      const existingAppsJson = await LocalStorage.getItem<string>("dify-apps");
      const existingApps: DifyApp[] = existingAppsJson ? JSON.parse(existingAppsJson) : [];

      // Check if name exists (and it's not the current app)
      const nameExists = existingApps.some(
        (existingApp) => existingApp.name === values.name && existingApp.name !== app.name,
      );

      if (nameExists) {
        setNameError("An application with this name already exists");
        return;
      }

      // Create timestamp with timezone information
      const now = new Date();
      const timestamp = now.toISOString();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const formattedTimestamp = `${timestamp} (${timezone})`;

      // Update the app
      const updatedApps = existingApps.map((existingApp) => {
        if (existingApp.name === app.name) {
          return {
            name: values.name,
            endpoint: values.endpoint,
            apiKey: values.apiKey,
            inputs: parsedInputs,
            type: appType,
            assistantName: values.assistantName,
            responseMode: responseMode,
            waitForResponse: waitForResponse,
            conversationType: conversationType,
            description: values.description,
            createdAt: existingApp.createdAt || formattedTimestamp, // Preserve creation time or set if missing
            updatedAt: formattedTimestamp, // Update the timestamp
          };
        }
        return existingApp;
      });

      // Save updated apps
      await LocalStorage.setItem("dify-apps", JSON.stringify(updatedApps));

      // Show success message
      await showToast({
        style: Toast.Style.Success,
        title: "Dify Application Updated",
        message: `Successfully updated application: ${values.name}`,
      });

      // Refresh the list
      onEdit();

      // Return to previous screen
      pop();
    } catch (error) {
      console.error("Error updating Dify application:", error);
      showFailureToast(error, {
        title: "Failed to Update Dify Application",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Download} title="Update Application" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Dify App"
        defaultValue={app.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="endpoint"
        title="Endpoint"
        placeholder="https://api.dify.ai/v1"
        defaultValue={app.endpoint}
        error={endpointError}
        onChange={() => setEndpointError(undefined)}
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder="app-xxxxxxxxxxxx"
        defaultValue={app.apiKey}
        error={apiKeyError}
        onChange={() => setApiKeyError(undefined)}
      />
      <Form.TextArea
        id="inputs"
        title="Input Variables"
        placeholder="variable1, variable2, variable3"
        defaultValue={app.inputs ? Object.keys(app.inputs).join(", ") : ""}
      />
      <Form.TextField
        id="assistantName"
        title="Assistant Name (Optional)"
        placeholder="Dify"
        defaultValue={app.assistantName || ""}
        info="Name to display for this assistant in conversations"
      />
      <Form.Dropdown
        id="type"
        title="App Type"
        value={appType}
        onChange={(newValue) => setAppType(newValue as DifyAppType)}
      >
        <Form.Dropdown.Item value={DifyAppType.ChatflowAgent} title="Chatflow/Agent" />
        <Form.Dropdown.Item value={DifyAppType.Workflow} title="Workflow" />
        <Form.Dropdown.Item value={DifyAppType.TextGenerator} title="Text Generator" />
      </Form.Dropdown>
      <Form.Dropdown
        id="responseMode"
        title="Response Mode"
        value={responseMode}
        onChange={(newValue) => setResponseMode(newValue)}
      >
        <Form.Dropdown.Item value="blocking" title="Blocking (Wait for full response)" />
        <Form.Dropdown.Item value="streaming" title="Streaming (Show response as it's generated)" />
      </Form.Dropdown>
      <Form.Dropdown
        id="waitForResponse"
        title="Wait Mode"
        value={waitForResponse ? "true" : "false"}
        onChange={(newValue) => setWaitForResponse(newValue === "true")}
        info="Whether to wait for the full response or just check if the API call was successful"
      >
        <Form.Dropdown.Item value="true" title="Wait Mode (Wait for full response)" />
        <Form.Dropdown.Item value="false" title="Non-Wait Mode (Only check API call success)" />
      </Form.Dropdown>
      <Form.Dropdown
        id="conversationType"
        title="Conversation Type"
        value={conversationType}
        onChange={(newValue) => setConversationType(newValue as DifyConversationType)}
        info="Whether to track conversation history for this app"
      >
        <Form.Dropdown.Item value={DifyConversationType.Continuous} title="Continuous (Track conversation history)" />
        <Form.Dropdown.Item value={DifyConversationType.SingleCall} title="Single Call (No conversation tracking)" />
      </Form.Dropdown>
      <Form.TextArea
        id="description"
        title="LLM Description (Optional)"
        placeholder="Add detailed notes about this LLM application..."
        defaultValue={app.description || ""}
        info="Optional. Add detailed information about this LLM, such as capabilities, limitations, or special instructions."
      />
    </Form>
  );
}

export default function Command() {
  const [apps, setApps] = useState<DifyApp[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  // Add sort order state
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const { push } = useNavigation();

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const appsJson = await LocalStorage.getItem<string>("dify-apps");
      const loadedApps: DifyApp[] = appsJson ? JSON.parse(appsJson) : [];

      // Create timestamp with timezone information
      const now = new Date();
      const timestamp = now.toISOString();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const formattedTimestamp = `${timestamp} (${timezone})`;

      // Add timestamps to apps that don't have them
      const updatedApps = loadedApps.map((app) => ({
        ...app,
        createdAt: app.createdAt || formattedTimestamp,
        updatedAt: app.updatedAt || formattedTimestamp,
      }));

      // Save the updated apps if any changes were made
      if (JSON.stringify(loadedApps) !== JSON.stringify(updatedApps)) {
        await LocalStorage.setItem("dify-apps", JSON.stringify(updatedApps));
      }

      // Sort apps based on sort order
      const sortedApps = sortAppsByOrder(updatedApps, sortOrder);
      setApps(sortedApps);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 根据排序方式对应用进行排序
  const sortAppsByOrder = (appsList: DifyApp[], order: "newest" | "oldest"): DifyApp[] => {
    return [...appsList].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt.split(" ")[0]).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt.split(" ")[0]).getTime() : 0;
      return order === "newest" ? dateB - dateA : dateA - dateB;
    });
  };

  // 当排序方式变化时，重新排序应用列表
  useEffect(() => {
    if (apps.length > 0) {
      const sortedApps = sortAppsByOrder(apps, sortOrder);
      setApps(sortedApps);
    }
  }, [sortOrder]);

  // 处理排序方式变化
  const handleSortOrderChange = (newOrder: "newest" | "oldest") => {
    setSortOrder(newOrder);
  };

  // Reload data
  const revalidate = () => {
    loadData();
  };

  // Load data when component mounts
  useEffect(() => {
    loadData();
  }, []);

  /**
   * Delete all Dify applications
   */
  const deleteAllApps = async () => {
    try {
      // Secondary confirmation
      if (
        !(await confirmAlert({
          title: "Delete All Dify Applications",
          message:
            "This action will delete all Dify applications and cannot be undone. Are you sure you want to continue?",
          icon: { source: Icon.Trash, tintColor: "#FF453A" },
          primaryAction: {
            title: "Delete All",
            style: Alert.ActionStyle.Destructive,
          },
        }))
      ) {
        return;
      }

      // Clear application list
      await LocalStorage.setItem("dify-apps", JSON.stringify([]));

      // Show success message
      await showToast({
        style: Toast.Style.Success,
        title: "All Dify Applications Deleted",
        message: "All applications have been successfully deleted",
      });

      // Update display
      revalidate();
    } catch (error) {
      // Handle error
      console.error("Error deleting all Dify applications:", error);
      showFailureToast(error, {
        title: "Failed to Delete All Dify Applications",
      });
    }
  };

  /**
   * Delete Dify application
   */
  const deleteApp = async (app: DifyApp) => {
    try {
      // Confirm deletion
      if (
        !(await confirmAlert({
          title: "Delete Dify Application",
          message: `Are you sure you want to delete "${app.name}"? This action cannot be undone.`,
          icon: { source: Icon.Trash, tintColor: "#FF453A" },
          primaryAction: {
            title: "Delete",
            style: Alert.ActionStyle.Destructive,
          },
        }))
      ) {
        return;
      }

      // Get existing app list
      const existingAppsJson = await LocalStorage.getItem<string>("dify-apps");
      const existingApps: DifyApp[] = existingAppsJson ? JSON.parse(existingAppsJson) : [];

      // Filter out the app to be deleted
      const updatedApps = existingApps.filter((existingApp) => existingApp.name !== app.name);

      // Save the updated list
      await LocalStorage.setItem("dify-apps", JSON.stringify(updatedApps));

      // Show success message
      await showToast({
        style: Toast.Style.Success,
        title: "Dify Application Deleted",
        message: `Successfully deleted application: ${app.name}`,
      });

      // Update display
      revalidate();
    } catch (error) {
      // Handle error
      console.error("Error deleting Dify application:", error);
      showFailureToast(error, {
        title: "Failed to Delete Dify Application",
      });
    }
  };

  // Build detail Markdown
  const getDetailMarkdown = (app: DifyApp) => {
    const formatInputs = (inputs: Record<string, unknown>): string => {
      if (!inputs || Object.keys(inputs).length === 0) {
        return "None";
      }
      return JSON.stringify(inputs, null, 2);
    };

    const typeDisplayText = getAppTypeText(app.type || DifyAppType.ChatflowAgent);

    return `# ${app.name}

## Configuration Details

| Property | Value |
| -------- | ----- |
| **Type** | ${typeDisplayText} |
| **Endpoint** | \`${app.endpoint}\` |
| **API Key** | \`${app.apiKey.substring(0, 4)}...${app.apiKey.substring(app.apiKey.length - 4)}\` |
| **Assistant Name** | ${app.assistantName || "Not set"} |
| **Response Mode** | ${app.responseMode || "blocking"} |
| **Wait Mode** | ${app.waitForResponse === false ? "Non-Wait Mode (Only check API call success)" : "Wait Mode (Wait for full response)"} |

## Description

${app.description || "No description provided."}

## Input Parameters

\`\`\`json
${formatInputs(app.inputs)}
\`\`\`

---

*Created: ${app.createdAt || `${new Date().toISOString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`}*  
*Last updated: ${app.updatedAt || `${new Date().toISOString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`}*`;
  };

  // Create a component for the Delete All Applications action
  function DeleteAllAppsAction() {
    return (
      <Action
        title="Delete All Applications"
        icon={{ source: Icon.Trash, tintColor: "#FF453A" }}
        style={Action.Style.Destructive}
        onAction={deleteAllApps}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      selectedItemId={selectedAppId}
      onSelectionChange={(id) => setSelectedAppId(id || "")}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort Order"
          onChange={(newValue) => handleSortOrderChange(newValue as "newest" | "oldest")}
          value={sortOrder}
        >
          <List.Dropdown.Item title="🔥 Newest First" value="newest" />
          <List.Dropdown.Item title="🕰️ Oldest First" value="oldest" />
        </List.Dropdown>
      }
    >
      {!apps || apps.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No Dify Applications"
          description="Use「Add Dify App」to Add an Application"
        />
      ) : (
        apps.map((app: DifyApp) => (
          <List.Item
            key={app.name}
            icon={getAppIconForList(app.type)}
            title={app.name}
            subtitle={getAppTypeText(app.type)}
            detail={<List.Item.Detail markdown={getDetailMarkdown(app)} />}
            accessories={[{ text: app.endpoint }, { tag: { value: app.type, color: getAppTypeColor(app.type) } }]}
            actions={
              <ActionPanel>
                <Action
                  title="Ask Application"
                  icon={Icon.Message}
                  onAction={() => {
                    // Navigate to AskDifyCommand and preselect the current app
                    push(<AskDifyCommand preselectedAppName={app.name} />);
                  }}
                  shortcut={{ modifiers: [], key: "return" }}
                />
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={<AppDetailView app={app} />}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
                <Action.Push
                  title="Edit Application"
                  icon={Icon.Pencil}
                  target={<EditDifyAppForm app={app} onEdit={revalidate} />}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action.CopyToClipboard
                  title="Copy Application Name"
                  content={app.name}
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Endpoint"
                  content={app.endpoint}
                  icon={Icon.Link}
                  shortcut={{ modifiers: ["shift", "opt"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Api Key"
                  content={app.apiKey}
                  icon={Icon.Key}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <ActionPanel.Section title="Danger Zone">
                  <Action
                    title="Delete Application"
                    icon={{ source: Icon.Trash, tintColor: "#FF453A" }}
                    style={Action.Style.Destructive}
                    onAction={() => deleteApp(app)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  />
                  {apps.length > 1 && <DeleteAllAppsAction />}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
