import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
  open,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  AppliedRole,
  getSavedRoles,
  hasBothRoleTypes,
  removeFromSaved,
  updateApplicationStatus,
} from "./utils/applications";
import { enhanceJobTitles } from "./utils/enhanceJobTitles";
import { ApplicationStatus } from "./utils/roles";
import { getStatusIcon } from "./utils/icons";
import CsvTools from "./components/ExportCSV";
import { formatLastUpdated } from "./utils/format";
import ImportCSVCommand from "./components/ImportCSV";
import NotesView from "./components/NotesView";

/**
 * Displays the user's saved and applied roles with filtering, status updates,
 * CSV import/export actions, and removal capabilities.
 */
export default function Command() {
  const [appliedJobs, setAppliedJobs] = useState<AppliedRole[]>([]);
  const [selectedRoleType, setSelectedRoleType] = useState<"" | "New Grad" | "Internship">("");
  const [showSelector, setShowSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { jobLinksBrowser } = getPreferenceValues();

  /**
   * Loads saved roles (optionally filtered by role type), sorts by most recent
   * appliedDate/statusUpdatedAt, updates state, and toggles the role-type selector.
   */
  const loadJobs = async () => {
    const jobs = await getSavedRoles(selectedRoleType ? selectedRoleType : undefined);
    const timeOr0 = (iso?: string) => (iso ? new Date(iso).getTime() : 0);
    setAppliedJobs(
      jobs.sort((a, b) => {
        const ta = timeOr0(a.appliedDate);
        const tb = timeOr0(b.appliedDate);
        if (tb !== ta) return tb - ta;
        return timeOr0(b.statusUpdatedAt) - timeOr0(a.statusUpdatedAt);
      }),
    );
    setShowSelector(await hasBothRoleTypes());
    setIsLoading(false);
  };

  useEffect(() => {
    setIsLoading(true);
    void loadJobs();
  }, [selectedRoleType]);

  /**
   * Refreshes the list after a successful CSV import so changes appear immediately.
   */
  const handleImportComplete = async () => {
    setIsLoading(true);
    await loadJobs();
  };

  /**
   * Confirms and permanently removes a role from the list, then reloads entries.
   *
   * @param jobId - Identifier of the role to remove.
   */
  const handleRemove = async (jobId: number) => {
    const confirmed = await confirmAlert({
      title: "Remove Application?",
      message: "This will permanently delete this application from your list.",
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await removeFromSaved(jobId);
      await loadJobs();
    }
  };

  /**
   * Updates a role's status, patches local state for instant UI feedback,
   * and shows a success/failure toast accordingly.
   *
   * @param jobId - Identifier of the role to update.
   * @param newStatus - New ApplicationStatus to set.
   */
  const updateStatus = async (jobId: number, newStatus: ApplicationStatus) => {
    try {
      await updateApplicationStatus(jobId, newStatus);

      setAppliedJobs((prevJobs) =>
        prevJobs.map((job) =>
          job.id === jobId
            ? {
                ...job,
                status: newStatus,
                statusUpdatedAt: new Date().toISOString(),
                ...(newStatus === "applied" && !job.appliedDate ? { appliedDate: new Date().toISOString() } : {}),
              }
            : job,
        ),
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Status Updated Successfully",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't Update Status",
        message: `${error ? (error as Error).message : "Please try again"}`,
      });
    }
  };

  /**
   * Conditional role-type filter dropdown shown when both role types exist.
   * Updates the selected role type and triggers a reload.
   */
  const searchBarAccessory = showSelector ? (
    <List.Dropdown
      tooltip={"Filter by role type"}
      onChange={(newValue: string) => {
        setIsLoading(true);
        setSelectedRoleType(newValue as "" | "New Grad" | "Internship");
      }}
      value={selectedRoleType}
    >
      <List.Dropdown.Item title={"All Applications"} value={""} />
      <List.Dropdown.Item title={"Internships"} value={"Internship"} />
      <List.Dropdown.Item title={"New Grad"} value={"New Grad"} />
    </List.Dropdown>
  ) : null;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search your applications"
      searchBarAccessory={searchBarAccessory}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Import">
            <Action.Push
              title={"Import from Spreadsheet"}
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              target={<ImportCSVCommand onComplete={handleImportComplete} />}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {appliedJobs.length === 0 ? (
        <List.EmptyView
          title="No saved applications yet"
          description="Jobs you save or apply to will show up here. Start by browsing roles and saving the ones you're interested in, or import your existing applications from a spreadsheet."
          icon={Icon.BlankDocument}
        />
      ) : (
        enhanceJobTitles<AppliedRole>(appliedJobs).map((job) => (
          <List.Item
            key={job.id}
            title={job.displayTitle}
            subtitle={`${job.company} • ${job.status.charAt(0).toUpperCase() + job.status.slice(1)}`}
            icon={getStatusIcon(job.status)}
            accessories={[
              ...(!job.is_active
                ? [
                    {
                      icon: Icon.ExclamationMark,
                      tooltip: "This job listing is no longer active.",
                    },
                  ]
                : []),
              ...(job.notes?.trim()
                ? [
                    {
                      icon: Icon.Pencil,
                      tooltip: job.notes,
                    },
                  ]
                : []),
              { text: formatLastUpdated(job.statusUpdatedAt) },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="View & Share">
                  <Action
                    title="View in Browser"
                    icon={Icon.Globe}
                    onAction={() => open(job.application_url, jobLinksBrowser.bundleId)}
                  />
                  <Action.CopyToClipboard
                    title={"Copy Link"}
                    content={job.application_url}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Quick Actions">
                  <ActionPanel.Submenu
                    title="Change Status"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  >
                    <Action
                      title="Saved"
                      icon={Icon.Bookmark}
                      onAction={() => updateStatus(job.id, "saved")}
                      shortcut={{ modifiers: ["cmd"], key: "1" }}
                    />
                    <Action
                      title="Applied"
                      icon={Icon.Circle}
                      onAction={() => updateStatus(job.id, "applied")}
                      shortcut={{ modifiers: ["cmd"], key: "2" }}
                    />
                    <Action
                      title="Interviewing"
                      icon={Icon.Clock}
                      onAction={() => updateStatus(job.id, "interviewing")}
                      shortcut={{ modifiers: ["cmd"], key: "3" }}
                    />
                    <Action
                      title="Got Offer"
                      icon={Icon.CheckCircle}
                      onAction={() => updateStatus(job.id, "offer")}
                      shortcut={{ modifiers: ["cmd"], key: "4" }}
                    />
                    <Action
                      title="Rejected"
                      icon={Icon.XMarkCircle}
                      onAction={() => updateStatus(job.id, "rejected")}
                      shortcut={{ modifiers: ["cmd"], key: "5" }}
                    />
                  </ActionPanel.Submenu>
                  <Action.Push
                    title={job.notes?.trim() ? "Edit Note" : "Add Note"}
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={
                      <NotesView
                        id={job.id}
                        initialNotes={job.notes ?? ""}
                        onSaved={(newNotes) => {
                          setAppliedJobs((prev) => prev.map((r) => (r.id === job.id ? { ...r, notes: newNotes } : r)));
                        }}
                      />
                    }
                  />
                  <Action
                    title="Remove from List"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => handleRemove(job.id)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Import & Export">
                  <Action.Push
                    title={"Import from Spreadsheet"}
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                    target={<ImportCSVCommand onComplete={handleImportComplete} />}
                  />
                  <Action.Push
                    title="Export as Spreadsheet"
                    icon={Icon.Upload}
                    target={<CsvTools data={appliedJobs} />}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
