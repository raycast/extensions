import { Action, ActionPanel, Alert, Icon, List, confirmAlert, showToast, Toast } from "@raycast/api";
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
import { formatAppliedDate } from "./utils/format";
import { getStatusIcon } from "./utils/icons";

export default function Command() {
  const [appliedJobs, setAppliedJobs] = useState<AppliedRole[]>([]);
  const [selectedRoleType, setSelectedRoleType] = useState<"Internship" | "New Grad" | "">(""); // start with All
  const [showSelector, setShowSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadJobs = async () => {
    const jobs = await getSavedRoles(selectedRoleType ? selectedRoleType : undefined);
    setAppliedJobs(jobs.sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime()));
    setShowSelector(await hasBothRoleTypes());
    setIsLoading(false);
  };

  useEffect(() => {
    setIsLoading(true);
    void loadJobs();
  }, [selectedRoleType]);

  const handleRemove = async (jobId: number) => {
    const confirmed = await confirmAlert({
      title: "Delete this application?",
      message: "This will remove it from your list permanently.",
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

  const updateStatus = async (jobId: number, newStatus: ApplicationStatus) => {
    try {
      await updateApplicationStatus(jobId, newStatus);

      setAppliedJobs((prevJobs) =>
        prevJobs.map((job) =>
          job.id === jobId ? { ...job, status: newStatus, statusUpdatedAt: new Date().toISOString() } : job,
        ),
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Status successfully updated",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update application",
        message: `${error ? (error as Error).message : "No details available"}`,
      });
    }
  };

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
    <List isLoading={isLoading} searchBarPlaceholder="Search your applications" searchBarAccessory={searchBarAccessory}>
      {appliedJobs.length === 0 ? (
        <List.EmptyView
          title="No applications yet"
          description="Jobs you apply to or save will appear here. Open a role to apply now, or copy the link to apply later."
          icon={Icon.BlankDocument}
        />
      ) : (
        enhanceJobTitles<AppliedRole>(appliedJobs).map((job) => (
          <List.Item
            key={job.id}
            title={job.displayTitle}
            subtitle={`${job.company} • ${job.status.charAt(0).toUpperCase() + job.status.slice(1)}`}
            icon={getStatusIcon(job.status)}
            accessories={[{ text: formatAppliedDate(job.appliedDate) }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={job.application_url} />
                <ActionPanel.Submenu
                  title="Change Status"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
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
                <Action
                  title="Delete Application"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => handleRemove(job.id)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
