import React, { useState, useEffect } from "react";
import {
  ActionPanel,
  List,
  Action,
  showToast,
  Toast,
  Icon,
  Detail,
  useNavigation,
  confirmAlert,
  Form,
} from "@raycast/api";
import {
  SalesforceService,
  MemoFileService,
  SalesforceRecord,
} from "./utils/salesforce";
import path from "path";
import fs from "fs";

interface MemoItem {
  title: string;
  path: string;
  metadata: {
    sfId?: string;
    sfName?: string;
    sfType?: string;
    createdAt?: string;
  };
}

// メモのJSONデータの型定義
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

export default function ViewMemos() {
  const [isLoading, setIsLoading] = useState(true);
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const { push } = useNavigation();
  const memoFileService = new MemoFileService();

  useEffect(() => {
    loadMemos();
  }, []);

  const loadMemos = async () => {
    setIsLoading(true);
    try {
      const memoPaths = memoFileService.listMemos();
      const memoItems: MemoItem[] = [];

      for (const memoPath of memoPaths) {
        try {
          const { content, metadata } = memoFileService.readMemo(memoPath);
          const filename = path.basename(memoPath);

          // Extract title from markdown (first line starting with #)
          // Improved title extraction: consider multi-line cases
          let title = filename;
          const titleMatch = content.match(/^#\s+(.+)$/m);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
            // Check for invalid characters in title
            if (title.length === 0) {
              title = filename;
            }
            // Output byte representation of title for debugging
            console.log(
              `Title "${title}" byte length: ${Buffer.from(title).length}`,
            );
          }

          memoItems.push({
            title,
            path: memoPath,
            metadata: metadata as MemoItem["metadata"],
          });
        } catch (error) {
          console.error(`Failed to read memo ${memoPath}:`, error);
        }
      }

      // Sort by creation date (newest first)
      memoItems.sort((a, b) => {
        const dateA = a.metadata.createdAt
          ? new Date(a.metadata.createdAt).getTime()
          : 0;
        const dateB = b.metadata.createdAt
          ? new Date(b.metadata.createdAt).getTime()
          : 0;
        return dateB - dateA;
      });

      setMemos(memoItems);
    } catch (error) {
      console.error("Error loading memos:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "An error occurred while loading memos",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMemo = async (memo: MemoItem) => {
    const confirmed = await confirmAlert({
      title: "Delete Memo",
      message: `Are you sure you want to delete "${memo.title}"?`,
      primaryAction: {
        title: "Delete",
      },
    });

    if (confirmed) {
      try {
        fs.unlinkSync(memo.path);
        await showToast({
          style: Toast.Style.Success,
          title: "Memo Deleted",
        });
        loadMemos();
      } catch (error) {
        console.error("Error deleting memo:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "An error occurred while deleting the memo",
        });
      }
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search memos">
      {memos.map((memo) => (
        <List.Item
          key={memo.path}
          title={memo.title}
          subtitle={
            memo.metadata.sfName
              ? `Related Record: ${memo.metadata.sfType} - ${memo.metadata.sfName}`
              : ""
          }
          accessoryTitle={
            memo.metadata.createdAt
              ? new Date(memo.metadata.createdAt).toLocaleString()
              : ""
          }
          actions={
            <ActionPanel>
              <Action
                title="View Memo"
                icon={Icon.Eye}
                onAction={() => push(<MemoDetail memo={memo} />)}
              />
              <Action
                title="Edit Memo"
                icon={Icon.Pencil}
                onAction={() => push(<EditMemo memo={memo} />)}
              />
              <Action
                title="Delete Memo"
                icon={Icon.Trash}
                onAction={() => deleteMemo(memo)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function MemoDetail({ memo }: { memo: MemoItem }) {
  const [isUploading, setIsUploading] = useState(false);
  const memoFileService = new MemoFileService();
  const salesforceService = new SalesforceService();
  const { push } = useNavigation();

  // Load memo content (JSON format)
  const { originalData } = memoFileService.readMemo(memo.path);

  // Create formatted markdown content from JSON data
  const createMarkdownContent = () => {
    if (!originalData) {
      return "Failed to load memo data";
    }

    if (!isMemoData(originalData)) {
      return "Invalid memo data format";
    }

    const title = originalData.title || "No Title";
    const content = originalData.content || "";
    const metadata = originalData.metadata || {};
    const syncStatus = originalData.syncStatus || {
      lastSyncedAt: null,
      sfNoteId: null,
    };

    // Metadata section
    let metadataSection = "";
    if (metadata.sfId) {
      metadataSection += `\n\n## Related Record Information\n`;
      metadataSection += `- **Type**: ${metadata.sfType || "Unknown"}\n`;
      metadataSection += `- **Name**: ${metadata.sfName || "Unknown"}\n`;
      metadataSection += `- **ID**: ${metadata.sfId}\n`;
    }

    // Date information
    let dateSection = "\n\n## Date Information\n";
    if (metadata.createdAt) {
      dateSection += `- **Created At**: ${new Date(metadata.createdAt).toLocaleString()}\n`;
    }
    if (metadata.updatedAt) {
      dateSection += `- **Updated At**: ${new Date(metadata.updatedAt).toLocaleString()}\n`;
    }

    // Sync information
    let syncSection = "";
    if (syncStatus.lastSyncedAt) {
      syncSection += `\n\n## Salesforce Sync Information\n`;
      syncSection += `- **Last Synced**: ${new Date(syncStatus.lastSyncedAt).toLocaleString()}\n`;
      syncSection += `- **Salesforce ID**: ${syncStatus.sfNoteId || "Unknown"}\n`;
    }

    return `# ${title}\n\n${content}${metadataSection}${dateSection}${syncSection}`;
  };

  const markdownContent = createMarkdownContent();

  const uploadToSalesforce = async () => {
    setIsUploading(true);
    try {
      if (!originalData) {
        throw new Error("Failed to load memo data");
      }

      console.log("Memo data before sending to Salesforce:", originalData);

      // Safely validate and use memo data with type guard
      if (!isMemoData(originalData)) {
        throw new Error("Invalid memo data format");
      }

      // Get title and content to send
      const title = originalData.title || memo.title;
      const content = originalData.content || "";
      const metadata = originalData.metadata || {};

      // Create memo in Salesforce
      const memoId = await salesforceService.createMemoRecord(
        title,
        content,
        metadata.sfId,
      );

      // After successful sending, update sync status
      const updated = await memoFileService.updateSyncStatus(memo.path, memoId);
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

  return (
    <Detail
      markdown={markdownContent}
      isLoading={isUploading}
      actions={
        <ActionPanel>
          <Action
            title="Send to Salesforce"
            icon={Icon.Upload}
            onAction={uploadToSalesforce}
          />
          <Action
            title="Edit Memo"
            icon={Icon.Pencil}
            onAction={() => push(<EditMemo memo={memo} />)}
          />
        </ActionPanel>
      }
    />
  );
}

// Edit Memo component
function EditMemo({ memo }: { memo: MemoItem }) {
  const memoFileService = new MemoFileService();
  const { pop, push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [relatedRecord, setRelatedRecord] = useState<
    SalesforceRecord | undefined
  >(undefined);

  // Load memo content
  const { metadata, originalData } = memoFileService.readMemo(memo.path);

  // Use original JSON data if available
  const jsonData = originalData || {
    title: memo.title,
    content: "",
    metadata: metadata,
  };

  // Initial values
  const [title, setTitle] = useState(jsonData.title || memo.title);
  const [memoContent, setMemoContent] = useState(jsonData.content || "");

  // Initial setup for related record
  useEffect(() => {
    // Get related record info from metadata
    const typedMetadata = metadata as MemoItem["metadata"];
    if (typedMetadata.sfId && typedMetadata.sfName && typedMetadata.sfType) {
      setRelatedRecord({
        Id: typedMetadata.sfId,
        Name: typedMetadata.sfName,
        Type: typedMetadata.sfType,
      });
    }
  }, [metadata]);

  // Show record search screen
  const handleRecordSelect = () => {
    push(<RecordSearch onRecordSelect={selectRecord} />);
  };

  // Record selection handler
  const selectRecord = (record: SalesforceRecord) => {
    console.log("Record selected in memo edit screen:", record);
    setRelatedRecord(record);
  };

  // Clear related record
  const clearRelatedRecord = () => {
    setRelatedRecord(undefined);
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
      // Update original JSON data
      const updatedData = {
        ...jsonData,
        title: values.title,
        content: values.content,
        metadata: {
          ...(jsonData.metadata || {}),
          updatedAt: new Date().toISOString(),
        },
      } as {
        title: string;
        content: string;
        metadata: Record<string, unknown>;
      };

      // Update related record information
      if (relatedRecord) {
        updatedData.metadata = {
          ...updatedData.metadata,
          sfId: relatedRecord.Id,
          sfName: relatedRecord.Name,
          sfType: relatedRecord.Type,
        };
      } else {
        // If related record is cleared, remove related info
        const metadataObj = updatedData.metadata;
        if ("sfId" in metadataObj) {
          delete metadataObj["sfId"];
          delete metadataObj["sfName"];
          delete metadataObj["sfType"];
        }
      }

      // Convert to JSON string
      const fileContent = JSON.stringify(updatedData, null, 2);

      // Save to the same file path
      await fs.promises.writeFile(memo.path, fileContent, { encoding: "utf8" });

      // Confirm file write
      console.log(`Memo update completed: ${memo.path} (JSON format)`);

      await showToast({
        style: Toast.Style.Success,
        title: "Memo Updated",
        message: "Changes saved",
      });

      // Return to previous screen
      pop();
    } catch (error) {
      console.error("Error updating memo:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "An error occurred while updating the memo",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Current related record display text
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
          {relatedRecord && (
            <Action
              title="Clear Related Record"
              onAction={clearRelatedRecord}
              icon={Icon.Trash}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter memo title"
        value={title as string}
        onChange={setTitle}
        autoFocus
      />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter memo content"
        value={memoContent as string}
        onChange={setMemoContent}
      />
      <Form.Description title="Related Record" text={relatedRecordText} />
    </Form>
  );
}

// Record search component (also added to view-memos)
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

      // Wait a bit to ensure record info is set
      setTimeout(() => {
        // Return to previous screen (memo edit screen)
        console.log("Returning to previous screen");
        pop();
      }, 300);
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
