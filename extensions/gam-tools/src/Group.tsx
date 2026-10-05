import { Action, ActionPanel, Form, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { getConfiguredDomains } from "./utils/preferences";
import { ensureGamOrInstall } from "./utils/setupGam";
import { runGam } from "./utils/gam";
import { runCommandInTerminal } from "./utils/terminal";

// ==========================================
// MAIN GROUPS HUB MENU
// ==========================================
export default function Command() {
  return (
    <List searchBarPlaceholder="Select a group management action...">
      <List.Section title="Google Group Directory & Management">
        <List.Item
          icon="../assets/add-person-badge.png"
          title="Manage Group Members"
          subtitle="Add, remove, or bulk-clear group members/managers"
          actions={
            <ActionPanel>
              <Action.Push title="Open Member Manager" target={<ManageGroupMembersView />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon="../assets/add-group.png"
          title="Create Group"
          subtitle="Provision a new Google Group"
          actions={
            <ActionPanel>
              <Action.Push title="Open Group Provisioning" target={<CreateGroupView />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon="../assets/update.png"
          title="Update Group Settings"
          subtitle="Modify identity details, posting rules, and external policies"
          actions={
            <ActionPanel>
              <Action.Push title="Open Settings Manager" target={<UpdateGroupSettingsView />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon="../assets/trash.png"
          title="Delete Group"
          subtitle="Permanently remove a Google Group"
          actions={
            <ActionPanel>
              <Action.Push title="Open Group Deletion" target={<DeleteGroupView />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon="../assets/edit-hard-drive.png"
          title="Manage Group Drive"
          subtitle="Purge files, folders, or empty group drive trash"
          actions={
            <ActionPanel>
              <Action.Push title="Open Drive Manager" target={<ManageGroupDriveView />} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// ==========================================
// 1. MANAGE GROUP MEMBERS SUB-VIEW
// ==========================================
function ManageGroupMembersView() {
  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<"add" | "remove" | "remove_all_members" | "remove_all_managers">("add");
  const { pop } = useNavigation();
  const domains = getConfiguredDomains();

  async function handleSubmit(values: {
    groupInput: string;
    userInput?: string;
    domain?: string;
    action: "add" | "remove" | "remove_all_members" | "remove_all_managers";
    role?: "member" | "manager" | "owner";
  }) {
    const gamReady = await ensureGamOrInstall();
    if (!gamReady) return;

    if (!values.groupInput?.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Missing Group Target" });
      return;
    }

    if ((action === "add" || action === "remove") && !values.userInput?.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Missing User Target" });
      return;
    }

    let group = values.groupInput.trim();
    let user = values.userInput?.trim() || "";

    if (values.domain) {
      if (!group.includes("@")) group = `${group}@${values.domain}`;
      if (user && !user.includes("@")) user = `${user}@${values.domain}`;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating membership...",
    });

    try {
      let cmd = "";
      if (action === "add") cmd = `update group ${group} add ${values.role || "member"} ${user}`;
      else if (action === "remove") cmd = `update group ${group} remove ${user}`;
      else if (action === "remove_all_members") cmd = `update group ${group} remove member`;
      else if (action === "remove_all_managers") cmd = `update group ${group} remove manager`;

      await runGam(cmd);

      toast.style = Toast.Style.Success;
      toast.title = "Membership Updated";
      toast.message = `Successfully executed operation for ${group}`;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Operation Failed";
      toast.message = (error as Error)?.message || String(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Execute Membership Change" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="action" title="Action" value={action} onChange={(val) => setAction(val as typeof action)}>
        <Form.Dropdown.Item value="add" title="Add User to Group" />
        <Form.Dropdown.Item value="remove" title="Remove Single User" />
        <Form.Dropdown.Item value="remove_all_members" title="Remove ALL Members (Role: Member)" />
        <Form.Dropdown.Item value="remove_all_managers" title="Remove ALL Managers (Role: Manager)" />
      </Form.Dropdown>

      <Form.Separator />
      <Form.TextField id="groupInput" title="Group Target" placeholder="engineering" />

      {(action === "add" || action === "remove") && (
        <Form.TextField id="userInput" title="User Target" placeholder="j.doe" />
      )}

      {domains.length > 0 && (
        <Form.Dropdown id="domain" title="Append Domain" defaultValue={domains[0]}>
          <Form.Dropdown.Item value="" title="None (Use exact inputs)" />
          {domains.map((dom) => (
            <Form.Dropdown.Item key={dom} value={dom} title={`@${dom}`} />
          ))}
        </Form.Dropdown>
      )}

      {action === "add" && (
        <Form.Dropdown id="role" title="Group Role" defaultValue="member">
          <Form.Dropdown.Item value="member" title="Member" />
          <Form.Dropdown.Item value="manager" title="Manager" />
          <Form.Dropdown.Item value="owner" title="Owner" />
        </Form.Dropdown>
      )}
    </Form>
  );
}

// ==========================================
// 2. CREATE GROUP SUB-VIEW
// ==========================================
function CreateGroupView() {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const domains = getConfiguredDomains();

  async function handleSubmit(values: {
    groupInput: string;
    groupName?: string;
    groupDescription?: string;
    domain?: string;
  }) {
    const gamReady = await ensureGamOrInstall();
    if (!gamReady) return;

    if (!values.groupInput?.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Missing Group Target" });
      return;
    }

    let group = values.groupInput.trim();
    if (values.domain && !group.includes("@")) {
      group = `${group}@${values.domain}`;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating group..." });

    try {
      let cmd = `create group ${group}`;
      if (values.groupName?.trim()) cmd += ` name "${values.groupName.trim()}"`;
      if (values.groupDescription?.trim()) cmd += ` description "${values.groupDescription.trim()}"`;

      await runGam(cmd);

      toast.style = Toast.Style.Success;
      toast.title = "Group Created";
      toast.message = `Successfully provisioned ${group}`;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Creation Failed";
      toast.message = (error as Error)?.message || String(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Provision Group" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="groupInput" title="Group Email / Prefix" placeholder="engineering" />
      {domains.length > 0 && (
        <Form.Dropdown id="domain" title="Append Domain" defaultValue={domains[0]}>
          <Form.Dropdown.Item value="" title="None (Use exact input)" />
          {domains.map((dom) => (
            <Form.Dropdown.Item key={dom} value={dom} title={`@${dom}`} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField id="groupName" title="Display Name" placeholder="Engineering Team" />
      <Form.TextField id="groupDescription" title="Description" placeholder="Engineering discussions and alerts" />
    </Form>
  );
}

// ==========================================
// 3. UPDATE GROUP SETTINGS SUB-VIEW
// ==========================================
function UpdateGroupSettingsView() {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const domains = getConfiguredDomains();

  async function handleSubmit(values: {
    groupInput: string;
    groupName?: string;
    groupDescription?: string;
    whoCanPost?: string;
    allowExternalMembers?: string;
    domain?: string;
  }) {
    const gamReady = await ensureGamOrInstall();
    if (!gamReady) return;

    if (!values.groupInput?.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Missing Group Target" });
      return;
    }

    let group = values.groupInput.trim();
    if (values.domain && !group.includes("@")) {
      group = `${group}@${values.domain}`;
    }

    const settings: string[] = [];
    if (values.groupName?.trim()) settings.push(`name "${values.groupName.trim()}"`);
    if (values.groupDescription?.trim()) settings.push(`description "${values.groupDescription.trim()}"`);
    if (values.whoCanPost && values.whoCanPost !== "ignore") settings.push(`who_can_post_message ${values.whoCanPost}`);
    if (values.allowExternalMembers && values.allowExternalMembers !== "ignore") {
      settings.push(`allow_external_members ${values.allowExternalMembers}`);
    }

    if (settings.length === 0) {
      showToast({ style: Toast.Style.Failure, title: "No Changes Specified" });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating settings..." });

    try {
      await runGam(`update group ${group} ${settings.join(" ")}`);

      toast.style = Toast.Style.Success;
      toast.title = "Settings Updated";
      toast.message = `Successfully modified attributes for ${group}`;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Update Failed";
      toast.message = (error as Error)?.message || String(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Settings Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="groupInput" title="Group Target" placeholder="engineering" />
      {domains.length > 0 && (
        <Form.Dropdown id="domain" title="Append Domain" defaultValue={domains[0]}>
          <Form.Dropdown.Item value="" title="None (Use exact input)" />
          {domains.map((dom) => (
            <Form.Dropdown.Item key={dom} value={dom} title={`@${dom}`} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Separator />
      <Form.Description text="Profile Metadata" />
      <Form.TextField id="groupName" title="New Display Name" placeholder="Optional" />
      <Form.TextField id="groupDescription" title="New Description" placeholder="Optional" />

      <Form.Separator />
      <Form.Description text="Access & Posting Policies" />
      <Form.Dropdown id="whoCanPost" title="Who Can Post" defaultValue="ignore">
        <Form.Dropdown.Item value="ignore" title="-- No Change --" />
        <Form.Dropdown.Item value="anyone_can_post" title="Anyone (Public)" />
        <Form.Dropdown.Item value="all_in_domain_can_post" title="All Domain Users" />
        <Form.Dropdown.Item value="all_members_can_post" title="Group Members Only" />
        <Form.Dropdown.Item value="all_managers_can_post" title="Managers/Owners Only" />
      </Form.Dropdown>

      <Form.Dropdown id="allowExternalMembers" title="External Members" defaultValue="ignore">
        <Form.Dropdown.Item value="ignore" title="-- No Change --" />
        <Form.Dropdown.Item value="true" title="Allow External Members" />
        <Form.Dropdown.Item value="false" title="Restrict to Domain Only" />
      </Form.Dropdown>
    </Form>
  );
}

// ==========================================
// 4. DELETE GROUP SUB-VIEW
// ==========================================
function DeleteGroupView() {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const domains = getConfiguredDomains();

  async function handleSubmit(values: { groupInput: string; domain?: string }) {
    const gamReady = await ensureGamOrInstall();
    if (!gamReady) return;

    if (!values.groupInput?.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Missing Group Target" });
      return;
    }

    let group = values.groupInput.trim();
    if (values.domain && !group.includes("@")) {
      group = `${group}@${values.domain}`;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting group..." });

    try {
      await runGam(`delete group ${group}`);

      toast.style = Toast.Style.Success;
      toast.title = "Group Deleted";
      toast.message = `Successfully deleted ${group}`;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Deletion Failed";
      toast.message = (error as Error)?.message || String(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Delete Group" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="groupInput" title="Group Target" placeholder="engineering" />
      {domains.length > 0 && (
        <Form.Dropdown id="domain" title="Append Domain" defaultValue={domains[0]}>
          <Form.Dropdown.Item value="" title="None (Use exact input)" />
          {domains.map((dom) => (
            <Form.Dropdown.Item key={dom} value={dom} title={`@${dom}`} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}

// ==========================================
// 5. MANAGE GROUP DRIVE SUB-VIEW
// ==========================================
function ManageGroupDriveView() {
  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<"purge_file" | "purge_folder" | "empty_trash">("purge_file");
  const domains = getConfiguredDomains();

  async function handleSubmit(values: {
    groupInput: string;
    domain?: string;
    action: "purge_file" | "purge_folder" | "empty_trash";
    targetName?: string;
  }) {
    const gamReady = await ensureGamOrInstall();
    if (!gamReady) return;

    if (!values.groupInput?.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Group Target Required" });
      return;
    }

    let groupEmail = values.groupInput.trim();
    if (values.domain && !groupEmail.includes("@")) {
      groupEmail = `${groupEmail}@${values.domain}`;
    }

    const target = values.targetName?.trim();
    if ((action === "purge_file" || action === "purge_folder") && !target) {
      showToast({ style: Toast.Style.Failure, title: "Target Name Required" });
      return;
    }

    setIsLoading(true);

    try {
      let cmd = "";
      const cleanTarget = target ? target.replace(/'/g, "\\'") : "";

      if (action === "empty_trash") {
        cmd = `group ${groupEmail} empty drivetrash`;
      } else if (action === "purge_file") {
        cmd = `group ${groupEmail} delete drivefile query "name = '${cleanTarget}'" purge`;
      } else if (action === "purge_folder") {
        cmd = `group ${groupEmail} delete drivefile query "name = '${cleanTarget}' and mimeType = 'application/vnd.google-apps.folder'" purge`;
      }

      await runCommandInTerminal(cmd);

      await showToast({
        style: Toast.Style.Success,
        title: "Opened in Terminal",
        message: `Running for ${groupEmail}...`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Command Failed",
        message: (error as Error)?.message || String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run in Terminal" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="groupInput" title="Target Group" placeholder="engineering" />

      {domains.length > 0 && (
        <Form.Dropdown id="domain" title="Append Domain" defaultValue={domains[0]}>
          <Form.Dropdown.Item value="" title="None (Use exact input above)" />
          {domains.map((dom) => (
            <Form.Dropdown.Item key={dom} value={dom} title={`@${dom}`} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Dropdown
        id="action"
        title="Drive Action"
        value={action}
        onChange={(val) => setAction(val as typeof action)}
      >
        <Form.Dropdown.Item value="purge_file" title="Find & Purge File by Name" />
        <Form.Dropdown.Item value="purge_folder" title="Find & Purge Folder" />
        <Form.Dropdown.Item value="empty_trash" title="Empty Drive Trash" />
      </Form.Dropdown>

      {action !== "empty_trash" && (
        <Form.TextField
          id="targetName"
          title={action === "purge_file" ? "File Name" : "Folder Name"}
          placeholder={action === "purge_file" ? "Confidential_Draft.pdf" : "Temp_Folder"}
        />
      )}
    </Form>
  );
}
