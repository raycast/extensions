import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  showHUD,
  popToRoot,
  closeMainWindow,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import useAppExists from "./hooks/useAppExists";
import useConfig from "./hooks/useConfig";
import useDB from "./hooks/useDB";
import useSearch from "./hooks/useSearch";

interface FormValues {
  content: string;
  spaceId: string;
}

interface Preferences {
  appendPosition: "end" | "beginning";
  addTimestamp: boolean;
  contentPrefix: string;
  contentSuffix: string;
}

// Helper function to format content with timestamp, prefix, and suffix
const formatContent = (content: string, preferences: Preferences): string => {
  let finalContent = content;

  if (preferences.addTimestamp) {
    const now = new Date();
    const timeString = now.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
    finalContent = `**${timeString}**${preferences.contentPrefix}${finalContent}`;
  } else {
    finalContent = `${preferences.contentPrefix}${finalContent}`;
  }

  // Add suffix
  finalContent = `${finalContent}${preferences.contentSuffix}`;

  return finalContent;
};

export default function AddToDailyNote() {
  const appExists = useAppExists();
  const configResult = useConfig(appExists);
  const config = configResult?.config || null;
  const configLoading = configResult?.configLoading || false;
  const preferences = getPreferenceValues<Preferences>();
  const db = useDB(configResult);

  const [formValues, setFormValues] = useState<FormValues>({
    content: "",
    spaceId: "",
  });

  // Format today's date as YYYY.MM.DD (Craft's internal db time format)
  const today = new Date();
  const dateString =
    today.getFullYear() +
    "." +
    String(today.getMonth() + 1).padStart(2, "0") +
    "." +
    String(today.getDate()).padStart(2, "0");

  // Use useSearch hook to get document blocks matching today's date string
  const { resultsLoading, results } = useSearch(db, dateString);

  // Find daily note blockId from search results and selected space
  const getDailyNoteBlockId = (): string | null => {
    if (!results) return null;
    const dailyNotes = results.filter(
      (block) => block.entityType === "document" && block.spaceID === formValues.spaceId
    );
    if (dailyNotes.length > 0) {
      return dailyNotes[0].id;
    }
    return null;
  };

  // Set default space when config loads, if none selected yet
  useEffect(() => {
    if (config && config.primarySpace() && !formValues.spaceId) {
      setFormValues((prev) => ({
        ...prev,
        spaceId: config.primarySpace()?.spaceID || "",
      }));
    }
  }, [config, formValues.spaceId]);

  const handleSubmit = () => {
    if (!formValues.content.trim()) {
      showHUD("❌ Content is required");
      return;
    }
    if (!formValues.spaceId) {
      showHUD("❌ Space is required");
      return;
    }
    if (!appExists.appExists) {
      showHUD("❌ Craft app is not installed");
      return;
    }

    // Format content with timestamp, prefix and suffix
    const finalContent = formatContent(formValues.content, preferences);

    // Always copy to clipboard as safety fallback
    Clipboard.copy(finalContent);

    const position = preferences.appendPosition === "beginning" ? "prepended to" : "appended to";
    showHUD(`✅ Content ${position} daily note (also copied to clipboard)`);

    popToRoot();
    closeMainWindow();
  };

  // Generate the append URL
  const getAppendUrl = () => {
    const parentBlockId = getDailyNoteBlockId();
    if (!parentBlockId || !formValues.spaceId) return null;

    const finalContent = formatContent(formValues.content, preferences);

    const index = preferences.appendPosition === "beginning" ? "0" : "999999";

    return `craftdocs://createblock?parentBlockId=${parentBlockId}&spaceId=${
      formValues.spaceId
    }&content=${encodeURIComponent(finalContent)}&index=${index}`;
  };

  // Generate fallback URL when no daily note exists
  const getFallbackUrl = () => {
    if (!formValues.spaceId) return null;
    return `craftdocs://openByQuery?query=today&spaceId=${formValues.spaceId}`;
  };

  if (!appExists.appExists && !appExists.appExistsLoading) {
    return (
      <Form>
        <Form.Description text="Craft app is not installed. Please install Craft to use this extension." />
      </Form>
    );
  }

  return (
    <Form
      isLoading={configLoading || appExists.appExistsLoading || resultsLoading}
      navigationTitle="Add to Daily Note"
      actions={
        <ActionPanel>
          {(() => {
            const appendUrl = getAppendUrl();
            const fallbackUrl = getFallbackUrl();

            if (appendUrl && formValues.content.trim() && formValues.spaceId) {
              return (
                <Action.OpenInBrowser
                  title="Add to Daily Note"
                  icon={Icon.Plus}
                  url={appendUrl}
                  onOpen={handleSubmit}
                />
              );
            } else if (fallbackUrl && formValues.content.trim() && formValues.spaceId) {
              return (
                <Action.OpenInBrowser
                  title="Create Daily Note & Copy Content"
                  icon={Icon.Calendar}
                  url={fallbackUrl}
                  onOpen={handleSubmit}
                />
              );
            } else {
              return <Action.SubmitForm title="Add to Daily Note" icon={Icon.Plus} onSubmit={handleSubmit} />;
            }
          })()}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="What would you like to add to today's daily note?"
        value={formValues.content}
        onChange={(value) => setFormValues((prev) => ({ ...prev, content: value }))}
        info="This content will be added to today's daily note with a timestamp"
      />
      <Form.Dropdown
        id="spaceId"
        title="Space"
        value={formValues.spaceId}
        onChange={(value) => setFormValues((prev) => ({ ...prev, spaceId: value }))}
      >
        {config?.getEnabledSpaces().map((space) => (
          <Form.Dropdown.Item
            key={space.spaceID}
            value={space.spaceID}
            title={config.getSpaceDisplayName(space.spaceID)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
