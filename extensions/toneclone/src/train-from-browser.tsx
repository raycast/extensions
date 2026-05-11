import {
  Action,
  ActionPanel,
  Detail,
  Form,
  showToast,
  Toast,
  LocalStorage,
  openExtensionPreferences,
  BrowserExtension,
  showHUD,
  closeMainWindow,
  popToRoot,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { Persona, TextUploadRequest, FILE_SOURCE_RAYCAST } from "./types";
import { getLastPersona, saveLastPersona } from "./preferences";

interface TrainingFromBrowserFormValues {
  personaId: string;
  sampleName: string;
  content: string;
  contentType: "text" | "markdown";
}

function TrainingFromBrowserForm() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultPersona, setDefaultPersona] = useState<string>("");
  const [, setActiveTab] = useState<string>("No tab info");
  const [tabContent, setTabContent] = useState<string>("No content available");
  const [tabMarkdown, setTabMarkdown] = useState<string>("No markdown available");
  const [browserAvailable, setBrowserAvailable] = useState<boolean>(false);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [currentTitle, setCurrentTitle] = useState<string>("");
  const [contentType, setContentType] = useState<"text" | "markdown">("text");
  const [editableContent, setEditableContent] = useState<string>("");

  const handleSignOut = useCallback(async () => {
    try {
      // Clear stored API key
      await LocalStorage.removeItem("toneclone-api-key");

      // Clear API key cache
      api.clearApiKeyCache();

      await showToast({
        style: Toast.Style.Success,
        title: "Signed out",
        message: "You have been signed out of ToneClone",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Sign out failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, []);

  // Load browser extension data
  const loadBrowserData = useCallback(async () => {
    try {
      // Get active tab info
      const tabs = await BrowserExtension.getTabs();
      const activeTabInfo = tabs.find((tab) => tab.active);

      if (activeTabInfo) {
        const url = activeTabInfo.url || "";
        const title = activeTabInfo.title || "No title";

        setCurrentUrl(url);
        setCurrentTitle(title);
        setActiveTab(`${title} - ${url}`);

        // Get tab content as both text and markdown
        try {
          const [textContent, markdownContent] = await Promise.all([
            BrowserExtension.getContent({
              format: "text",
              tabId: activeTabInfo.id,
            }),
            BrowserExtension.getContent({
              format: "markdown",
              tabId: activeTabInfo.id,
            }),
          ]);

          setTabContent(textContent);
          setTabMarkdown(markdownContent);
          setEditableContent(textContent); // Initialize with text content
          setBrowserAvailable(true);
        } catch (contentError) {
          console.warn("Could not get tab content:", contentError);
          setTabContent("Could not retrieve tab content");
          setTabMarkdown("Could not retrieve tab content");
          setBrowserAvailable(false);
        }
      } else {
        setActiveTab("No active tab found");
        setTabContent("No active tab found");
        setTabMarkdown("No active tab found");
        setCurrentUrl("");
        setCurrentTitle("");
        setBrowserAvailable(false);
      }
    } catch (error) {
      console.warn("Browser extension not available:", error);
      setActiveTab("Browser extension not available");
      setTabContent("Browser extension not available");
      setTabMarkdown("Browser extension not available");
      setCurrentUrl("");
      setCurrentTitle("");
      setBrowserAvailable(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load browser extension data for context
      await loadBrowserData();

      const [personasData, lastPersona] = await Promise.all([api.getPersonas(), getLastPersona("train-browser")]);

      setPersonas(personasData);

      // Set default persona
      if (lastPersona && personasData.some((p) => p.personaId === lastPersona)) {
        setDefaultPersona(lastPersona);
      } else if (personasData.length > 0) {
        setDefaultPersona(personasData[0].personaId);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [loadBrowserData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update editable content when content type changes
  useEffect(() => {
    if (contentType === "text") {
      setEditableContent(tabContent);
    } else {
      setEditableContent(tabMarkdown);
    }
  }, [contentType, tabContent, tabMarkdown]);

  const handleSubmit = useCallback(
    async (values: TrainingFromBrowserFormValues) => {
      if (!values.personaId) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Validation Error",
          message: "Please select a persona",
        });
        return;
      }

      if (!values.sampleName?.trim() || !values.content?.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Validation Error",
          message: "Sample name and content are required",
        });
        return;
      }

      if (!browserAvailable || !values.content || values.content === "Browser extension not available") {
        await showToast({
          style: Toast.Style.Failure,
          title: "Browser Context Required",
          message: "This command requires browser extension access to get tab content",
        });
        return;
      }

      try {
        setIsSubmitting(true);

        // Show upload progress toast
        await showToast({
          style: Toast.Style.Animated,
          title: "Uploading Training Content",
          message: "Please wait while we upload your content...",
        });

        // Save preferences
        await saveLastPersona("train-browser", values.personaId);

        // Upload text content
        const textRequest: TextUploadRequest = {
          content: values.content,
          filename: values.sampleName.endsWith(".txt") ? values.sampleName : `${values.sampleName}.txt`,
          source: FILE_SOURCE_RAYCAST,
        };

        const uploadResponse = await api.uploadText(textRequest);

        // Associate with persona
        await api.associateFilesWithPersona(values.personaId, {
          fileIds: [uploadResponse.fileId],
        });

        const personaName = personas.find((p) => p.personaId === values.personaId)?.name || "Unknown";

        await showHUD(`✅ Added "${values.sampleName}" to ${personaName}`);
        await closeMainWindow();
        await popToRoot();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Upload Failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [personas, browserAvailable],
  );

  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading personas and browser context..." />;
  }

  if (!browserAvailable) {
    return (
      <Detail
        markdown="# Browser Extension Required

This command requires the Raycast Browser Extension to be installed and accessible to get the active tab content.

Please install the Raycast Browser Extension and make sure it has the necessary permissions to access tab content.

Visit [Raycast Browser Extension](https://raycast.com/browser-extension) to install it."
      />
    );
  }

  if (personas.length === 0) {
    return (
      <Detail
        markdown="# No Personas Found

You need to create at least one persona in ToneClone before you can upload training content.

Visit [ToneClone](https://app.toneclone.ai) to create your first persona."
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload Training Content" onSubmit={handleSubmit} icon="📚" />
          <ActionPanel.Section title="Account">
            <Action
              title="Sign out"
              onAction={handleSignOut}
              icon="🚪"
              shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
            />
            <Action
              title="Extension Preferences"
              onAction={openExtensionPreferences}
              icon="⚙️"
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.Dropdown
        id="personaId"
        title="Persona"
        defaultValue={defaultPersona}
        info="Select the persona to train with this browser tab content"
      >
        {personas.map((persona) => (
          <Form.Dropdown.Item
            key={persona.personaId}
            value={persona.personaId}
            title={persona.name}
            icon={persona.trainingStatus === "completed" ? "✅" : "⏳"}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="sampleName"
        title="Sample Name"
        placeholder={`${currentTitle} - ${currentUrl}`}
        defaultValue={`${currentTitle} - ${currentUrl}`}
        info="Name for this training sample (will be used as filename)"
      />

      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Browser tab content will appear here..."
        value={editableContent}
        onChange={setEditableContent}
        info={`The ${contentType} content from the current browser tab that will be used for training. You can edit this content before uploading.`}
      />

      <Form.Dropdown
        id="contentType"
        title="Content Format"
        defaultValue="text"
        onChange={(value) => setContentType(value as "text" | "markdown")}
        info="Choose whether to use the text or markdown version of the page content"
      >
        <Form.Dropdown.Item value="text" title="Text" icon="📝" />
        <Form.Dropdown.Item value="markdown" title="Markdown" icon="📄" />
      </Form.Dropdown>

      <Form.Description text={`Content Length: ${editableContent.length} characters`} />
    </Form>
  );
}

function Command() {
  return <TrainingFromBrowserForm />;
}

export default Command;
