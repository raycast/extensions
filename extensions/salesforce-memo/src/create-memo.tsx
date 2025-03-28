import React, { useState } from "react";
import {
  ActionPanel,
  Form,
  Action,
  showToast,
  Toast,
  Icon,
  Detail,
  useNavigation,
  List,
} from "@raycast/api";
import {
  SalesforceService,
  MemoFileService,
  SalesforceRecord,
} from "./utils/salesforce";

// Type definition for memo data
interface MemoData {
  title: string;
  content: string;
  metadata: {
    createdAt?: string;
    updatedAt?: string;
    sfId?: string;
    sfName?: string;
    sfType?: string;
  };
  syncStatus?: {
    lastSyncedAt: string | null;
    sfNoteId: string | null;
  };
}

// Type guard function to verify MemoData structure
function isMemoData(data: unknown): data is MemoData {
  if (!data || typeof data !== "object") return false;

  const memo = data as Record<string, unknown>;

  return (
    typeof memo.title === "string" &&
    typeof memo.content === "string" &&
    memo.metadata !== undefined &&
    typeof memo.metadata === "object"
  );
}

export default function CreateMemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [relatedRecord, setRelatedRecord] = useState<
    SalesforceRecord | undefined
  >(undefined);
  const { push } = useNavigation();

  const memoFileService = new MemoFileService();

  const handleRecordSelect = () => {
    push(<RecordSearch onRecordSelect={selectRecord} />);
  };

  const selectRecord = (record: SalesforceRecord) => {
    console.log("Record selected in main screen:", record);
    setRelatedRecord(record);
    // Direct log output (no setTimeout needed)
    console.log("Record selection completed in main screen:", { record });
  };

  const handleSubmit = async (values: { title: string; content: string }) => {
    if (!values.title || !values.content) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Input Error",
        message: "Please enter both title and content",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Save memo locally
      const filePath = await memoFileService.saveMemo(
        values.title,
        values.content,
        relatedRecord,
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Memo Saved",
        message: "Saved to local storage",
      });

      // Navigate to detail screen with send to Salesforce button
      push(
        <MemoDetail
          title={values.title}
          content={values.content}
          filePath={filePath}
          relatedRecord={relatedRecord}
        />,
      );
    } catch (error) {
      console.error("Memo save error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "An error occurred while saving the memo",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const relatedRecordText = relatedRecord
    ? `${relatedRecord.Type}: ${relatedRecord.Name}`
    : "None";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Memo"
            onSubmit={handleSubmit}
            icon={Icon.Document}
          />
          <Action
            title="Select Related Record"
            onAction={handleRecordSelect}
            icon={Icon.Link}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter memo title"
        value={title}
        onChange={setTitle}
        autoFocus
      />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter memo content"
        value={content}
        onChange={setContent}
      />
      <Form.Description title="Related Record" text={relatedRecordText} />
    </Form>
  );
}

// Record search component
function RecordSearch({
  onRecordSelect,
}: {
  onRecordSelect: (record: SalesforceRecord) => void;
}) {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [records, setRecords] = useState<SalesforceRecord[]>([]);
  const salesforceService = new SalesforceService();
  const { pop } = useNavigation();

  const searchRecords = async () => {
    if (!searchText || searchText.length < 2) return;

    setIsLoading(true);
    try {
      const credentials = await salesforceService.getCredentials();
      if (!credentials) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Authentication Error",
          message: "Salesforce credentials are not configured",
        });
        return;
      }

      const searchResults = await salesforceService.searchRecords(searchText);
      setRecords(searchResults);
    } catch (error) {
      console.error("Record search error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Search Error",
        message: "An error occurred while searching for records",
      });
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchText.length >= 2) {
        searchRecords();
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchText]);

  const handleRecordSelection = async (record: SalesforceRecord) => {
    console.log("Record selection process started:", record);
    try {
      // Execute record selection
      onRecordSelect(record);
      console.log("Record selection completed");

      // Success message
      await showToast({
        style: Toast.Style.Success,
        title: "Record Selected",
        message: `[${record.Type}] ${record.Name}`,
      });

      // Return to previous screen immediately
      console.log("Returning to previous screen");
      pop();
    } catch (error) {
      console.error("Record selection error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `Record selection failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for records"
      onSearchTextChange={setSearchText}
      throttle
    >
      {records.map((record) => (
        <List.Item
          key={record.Id}
          title={`[${record.Type}] ${record.Name}`}
          subtitle={`ID: ${record.Id}`}
          accessoryTitle=""
          icon={getObjectIcon(record.Type)}
          actions={
            <ActionPanel>
              <Action
                title="Select This Record"
                onAction={() => handleRecordSelection(record)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// Function to return an icon based on object type
function getObjectIcon(objectType: string): Icon {
  switch (objectType.toLowerCase()) {
    case "account":
      return Icon.Building;
    case "contact":
      return Icon.Person;
    case "opportunity":
      return Icon.Star;
    case "lead":
      return Icon.Bookmark;
    case "case":
      return Icon.Box;
    case "task":
      return Icon.CheckCircle;
    case "cs__c":
      return Icon.Tag;
    default:
      return Icon.Document;
  }
}

// Memo detail display and submission component
function MemoDetail({
  title,
  content,
  filePath,
  relatedRecord,
}: {
  title: string;
  content: string;
  filePath: string;
  relatedRecord?: SalesforceRecord;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const salesforceService = new SalesforceService();
  const memoFileService = new MemoFileService();

  const uploadToSalesforce = async () => {
    setIsUploading(true);
    try {
      // Load the latest memo data
      const { originalData } = memoFileService.readMemo(filePath);

      if (!originalData) {
        throw new Error("Failed to load memo data");
      }

      console.log("Memo data before sending to Salesforce:", originalData);

      // Safely validate and use memo data with type guard
      if (!isMemoData(originalData)) {
        throw new Error("Invalid memo data format");
      }

      const memoId = await salesforceService.createMemoRecord(
        originalData.title || title,
        originalData.content || content,
        relatedRecord?.Id,
      );

      // After successful sending, update sync status
      const updated = await memoFileService.updateSyncStatus(filePath, memoId);
      if (updated) {
        console.log("Sync status updated:", memoId);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Memo Sent to Salesforce",
        message: `Memo ID: ${memoId}`,
      });
    } catch (error) {
      console.error("Salesforce send error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Send Error",
        message: "An error occurred while sending memo to Salesforce",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Create formatted markdown content from JSON data
  const createMarkdownContent = () => {
    try {
      // Load JSON data from file
      const { originalData } = memoFileService.readMemo(filePath);

      if (!originalData) {
        return `# ${title}\n\n${content}\n\n---\n\n**File Location**: ${filePath}\n${relatedRecord ? `**Related Record**: ${relatedRecord.Type} - ${relatedRecord.Name} (${relatedRecord.Id})` : ""}`;
      }

      if (!isMemoData(originalData)) {
        console.error("Invalid memo data format in createMarkdownContent");
        return `# ${title}\n\n${content}\n\n---\n\n**File Location**: ${filePath}\n${relatedRecord ? `**Related Record**: ${relatedRecord.Type} - ${relatedRecord.Name} (${relatedRecord.Id})` : ""}`;
      }

      const jsonTitle = originalData.title || title;
      const jsonContent = originalData.content || content;
      const metadata = originalData.metadata || {};

      // Metadata section
      let metadataSection = "";
      if (relatedRecord || metadata.sfId) {
        metadataSection += `\n\n## Related Record Information\n`;
        if (relatedRecord) {
          metadataSection += `- **Type**: ${relatedRecord.Type || "Unknown"}\n`;
          metadataSection += `- **Name**: ${relatedRecord.Name || "Unknown"}\n`;
          metadataSection += `- **ID**: ${relatedRecord.Id}\n`;
        } else if (metadata.sfId) {
          metadataSection += `- **Type**: ${metadata.sfType || "Unknown"}\n`;
          metadataSection += `- **Name**: ${metadata.sfName || "Unknown"}\n`;
          metadataSection += `- **ID**: ${metadata.sfId}\n`;
        }
      }

      // Date information
      let dateSection = "\n\n## Date Information\n";
      if (metadata.createdAt) {
        dateSection += `- **Created At**: ${new Date(metadata.createdAt).toLocaleString()}\n`;
      }
      if (metadata.updatedAt) {
        dateSection += `- **Updated At**: ${new Date(metadata.updatedAt).toLocaleString()}\n`;
      }

      return `# ${jsonTitle}\n\n${jsonContent}\n\n---\n\n**File Location**: ${filePath}\n${relatedRecord ? `**Related Record**: ${relatedRecord.Type} - ${relatedRecord.Name} (${relatedRecord.Id})` : ""}\n${metadataSection}\n${dateSection}`;
    } catch (error) {
      console.error("Markdown content creation error:", error);
      return `# ${title}\n\n${content}\n\n---\n\n**File Location**: ${filePath}\n${relatedRecord ? `**Related Record**: ${relatedRecord.Type} - ${relatedRecord.Name} (${relatedRecord.Id})` : ""}`;
    }
  };

  return (
    <Detail
      markdown={createMarkdownContent()}
      isLoading={isUploading}
      actions={
        <ActionPanel>
          <Action
            title="Send to Salesforce"
            onAction={uploadToSalesforce}
            icon={Icon.Upload}
          />
        </ActionPanel>
      }
    />
  );
}
