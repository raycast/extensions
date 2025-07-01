import { Detail, ActionPanel, Action, Icon, showToast, Toast, Form } from "@raycast/api";
import { useState, useEffect } from "react";
import { ParcelWithStatus } from "./parcel-service";
import { Ship24ApiClient } from "./api";
import { getPreferences } from "./preferences";
import { StorageService } from "./storage";
import { generateTrackingMarkdown } from "./utils/markdown-generator";

interface ParcelDetailsProps {
  parcel: ParcelWithStatus;
  onRefresh: () => void;
}

export function ParcelDetails({ parcel, onRefresh }: ParcelDetailsProps) {
  const [searchResults, setSearchResults] = useState<ParcelWithStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSearchResults();
  }, [parcel.trackingNumber]);

  async function loadSearchResults() {
    try {
      setIsLoading(true);
      const { apiKey } = getPreferences();
      const apiClient = new Ship24ApiClient(apiKey);

      const tracking = await apiClient.searchTrackingResults(parcel.trackingNumber);

      setSearchResults({
        ...parcel,
        status: tracking,
      });
    } catch (err) {
      setSearchResults({
        ...parcel,
        error: err instanceof Error ? err.message : JSON.stringify(err, null, 2),
      });
    } finally {
      setIsLoading(false);
    }
  }

  function generateMarkdown(): string {
    const currentParcel = searchResults || parcel;

    // Loading state
    if (isLoading) {
      const sections = [];
      sections.push(`# ${currentParcel.name || currentParcel.trackingNumber}`);
      sections.push(`## 🔄 Loading\nFetching latest tracking information...`);
      return sections.join("\n\n");
    }

    // Use shared markdown generator
    return generateTrackingMarkdown({
      trackingNumber: currentParcel.trackingNumber,
      name: currentParcel.name,
      tracking: currentParcel.status || null,
      error: currentParcel.error,
      addedAt: currentParcel.addedAt,
    });
  }

  async function handleRefresh() {
    await loadSearchResults();
    onRefresh();
    showToast({
      style: Toast.Style.Success,
      title: "Refreshed",
      message: "Tracking information updated",
    });
  }

  async function handleRename(newName: string) {
    try {
      await StorageService.updateParcel(parcel.trackingNumber, { name: newName.trim() || undefined });

      // Update local state immediately
      if (searchResults) {
        setSearchResults({
          ...searchResults,
          name: newName.trim() || undefined,
        });
      }

      // Refresh the list
      onRefresh();

      showToast({
        style: Toast.Style.Success,
        title: "Renamed",
        message: `Parcel renamed to "${newName.trim()}"`,
      });
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to rename parcel",
      });
    }
  }

  const currentParcel = searchResults || parcel;

  return (
    <Detail
      isLoading={isLoading}
      markdown={generateMarkdown()}
      actions={
        <ActionPanel>
          <Action title="Refresh Status" icon={Icon.ArrowClockwise} onAction={handleRefresh} />
          <Action.Push
            title="Rename Parcel"
            icon={Icon.Pencil}
            target={<RenameParcelForm parcel={currentParcel} onRename={handleRename} />}
          />
        </ActionPanel>
      }
    />
  );
}

interface RenameParcelFormProps {
  parcel: ParcelWithStatus;
  onRename: (newName: string) => void;
}

function RenameParcelForm({ parcel, onRename }: RenameParcelFormProps) {
  const [name, setName] = useState(parcel.name || "");

  function handleSubmit() {
    onRename(name);
  }

  return (
    <Form
      navigationTitle="Rename Parcel"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Rename parcel with tracking number: ${parcel.trackingNumber}`} />
      <Form.TextField
        id="name"
        title="Parcel Name"
        placeholder="Enter a name for this parcel"
        value={name}
        onChange={setName}
      />
    </Form>
  );
}
