import { Action, ActionPanel, Detail, Form, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { getConfiguredDomains } from "./utils/preferences";
import { ensureGamOrInstall } from "./utils/setupGam";
import { runGam } from "./utils/gam";
import { runCommandInTerminal } from "./utils/terminal";

// ==========================================
// MAIN DRIVE HUB MENU
// ==========================================
export default function Command() {
  return (
    <List searchBarPlaceholder="Select a Drive management action...">
      <List.Section title="Google Drive Management">
        <List.Item
          icon="../assets/transfer-hard-drive.png"
          title="Transfer Drive Ownership"
          subtitle="Reassign all files from one user account to another"
          actions={
            <ActionPanel>
              <Action.Push title="Open Transfer Tool" target={<TransferDriveOwnershipView />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon="../assets/folder-hard-drive.png"
          title="Create Drive Folder / File"
          subtitle="Provision new folders or uploads in a target user's Drive"
          actions={
            <ActionPanel>
              <Action.Push title="Open Creation Form" target={<CreateDriveResourceView />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon="../assets/lock-hard-drive.png"
          title="Manage Sharing & Permissions (ACL)"
          subtitle="Add or remove file reader, editor, or owner access"
          actions={
            <ActionPanel>
              <Action.Push title="Open Permissions Tool" target={<ManageDrivePermissionsView />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon="../assets/search-hard-drive.png"
          title="Search & Audit Drive Files"
          subtitle="Query user file holdings by name, type, or sharing status"
          actions={
            <ActionPanel>
              <Action.Push title="Open Search Tool" target={<SearchDriveFilesView />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon="../assets/delete-hard-drive.png"
          title="Purge User Files / Empty Trash"
          subtitle="Permanently delete files by ID/Query or empty user Drive trash"
          actions={
            <ActionPanel>
              <Action.Push title="Open Purge Tool" target={<PurgeDriveView />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon="../assets/delete-hard-drive.png"
          title="Manage Group Drive"
          subtitle="Purge files, folders, or empty trash for a Google Group"
          actions={
            <ActionPanel>
              <Action.Push title="Open Group Drive Tool" target={<ManageGroupDriveView />} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// ==========================================
// 1. TRANSFER OWNERSHIP SUB-VIEW
// ==========================================
function TransferDriveOwnershipView() {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const domains = getConfiguredDomains();

  async function handleSubmit(values: {
    sourceUser: string;
    targetUser: string;
    domain?: string;
    retainPreviousOwnerAccess?: boolean;
  }) {
    const gamReady = await ensureGamOrInstall();
    if (!gamReady) return;

    if (!values.sourceUser?.trim() || !values.targetUser?.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Missing Users",
        message: "Provide both source and target users.",
      });
      return;
    }

    let source = values.sourceUser.trim();
    let target = values.targetUser.trim();

    if (values.domain) {
      if (!source.includes("@")) source = `${source}@${values.domain}`;
      if (!target.includes("@")) target = `${target}@${values.domain}`;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Transferring Drive Ownership..." });

    try {
      let cmd = `create datatransfer ${source} gdrive ${target}`;
      if (values.retainPreviousOwnerAccess) {
        cmd += ` retainpreviousowneraccess`;
      }

      await runGam(cmd);

      toast.style = Toast.Style.Success;
      toast.title = "Transfer Initiated";
      toast.message = `Data transfer started from ${source} to ${target}`;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Transfer Failed";
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
          <Action.SubmitForm title="Initiate Transfer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="sourceUser" title="Source Account (Current Owner)" placeholder="old.user" />
      <Form.TextField id="targetUser" title="Target Account (New Owner)" placeholder="new.user" />

      {domains.length > 0 && (
        <Form.Dropdown id="domain" title="Append Domain" defaultValue={domains[0]}>
          <Form.Dropdown.Item value="" title="None (Use exact inputs)" />
          {domains.map((dom) => (
            <Form.Dropdown.Item key={dom} value={dom} title={`@${dom}`} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Separator />
      <Form.Checkbox
        id="retainPreviousOwnerAccess"
        label="Retain previous owner as editor on transferred files"
        defaultValue={true}
      />
    </Form>
  );
}

// ==========================================
// 2. CREATE DRIVE RESOURCE SUB-VIEW
// ==========================================
function CreateDriveResourceView() {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const domains = getConfiguredDomains();

  async function handleSubmit(values: {
    userTarget: string;
    resourceName: string;
    domain?: string;
    parentFolderId?: string;
  }) {
    const gamReady = await ensureGamOrInstall();
    if (!gamReady) return;

    if (!values.userTarget?.trim() || !values.resourceName?.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Missing Inputs", message: "User and folder name are required." });
      return;
    }

    let user = values.userTarget.trim();
    if (values.domain && !user.includes("@")) {
      user = `${user}@${values.domain}`;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating folder..." });

    try {
      let cmd = `user ${user} create drivefile drivefilename "${values.resourceName.trim()}" mimetype gfolder`;
      if (values.parentFolderId?.trim()) {
        cmd += ` parentid "${values.parentFolderId.trim()}"`;
      }

      await runGam(cmd);

      toast.style = Toast.Style.Success;
      toast.title = "Folder Created";
      toast.message = `Created "${values.resourceName}" in ${user}'s Drive`;
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
          <Action.SubmitForm title="Create Folder" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="userTarget" title="User Target" placeholder="j.doe" />
      {domains.length > 0 && (
        <Form.Dropdown id="domain" title="Append Domain" defaultValue={domains[0]}>
          <Form.Dropdown.Item value="" title="None (Use exact input)" />
          {domains.map((dom) => (
            <Form.Dropdown.Item key={dom} value={dom} title={`@${dom}`} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Separator />
      <Form.TextField id="resourceName" title="Folder Name" placeholder="New Operations Folder" />
      <Form.TextField id="parentFolderId" title="Parent Folder ID (Optional)" placeholder="Root if left blank" />
    </Form>
  );
}

// ==========================================
// 3. MANAGE PERMISSIONS (ACL) SUB-VIEW
// ==========================================
function ManageDrivePermissionsView() {
  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<"add" | "remove">("add");
  const { pop } = useNavigation();
  const domains = getConfiguredDomains();

  async function handleSubmit(values: {
    ownerInput: string;
    fileId: string;
    granteeInput: string;
    domain?: string;
    role: "reader" | "commenter" | "editor" | "owner";
  }) {
    const gamReady = await ensureGamOrInstall();
    if (!gamReady) return;

    if (!values.ownerInput?.trim() || !values.fileId?.trim() || !values.granteeInput?.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Missing Required Fields" });
      return;
    }

    let owner = values.ownerInput.trim();
    let grantee = values.granteeInput.trim();

    if (values.domain) {
      if (!owner.includes("@")) owner = `${owner}@${values.domain}`;
      if (!grantee.includes("@")) grantee = `${grantee}@${values.domain}`;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating permissions..." });

    try {
      let cmd = "";
      if (action === "add") {
        cmd = `user ${owner} add drivefileacl ${values.fileId.trim()} ${values.role} user ${grantee}`;
      } else {
        cmd = `user ${owner} delete drivefileacl ${values.fileId.trim()} ${grantee}`;
      }

      await runGam(cmd);

      toast.style = Toast.Style.Success;
      toast.title = action === "add" ? "Permission Granted" : "Permission Revoked";
      toast.message = `Updated access on file ${values.fileId.trim()} for ${grantee}`;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Permission Update Failed";
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
          <Action.SubmitForm title="Execute ACL Update" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="action"
        title="ACL Action"
        value={action}
        onChange={(val) => setAction(val as "add" | "remove")}
      >
        <Form.Dropdown.Item value="add" title="Grant File Access (Add ACL)" />
        <Form.Dropdown.Item value="remove" title="Revoke File Access (Delete ACL)" />
      </Form.Dropdown>

      <Form.Separator />
      <Form.TextField id="ownerInput" title="File Owner Account" placeholder="j.doe" />
      <Form.TextField id="fileId" title="Target File/Folder ID" placeholder="1A2b3C4d5E..." />
      <Form.TextField id="granteeInput" title="Recipient Email" placeholder="collaborator" />

      {domains.length > 0 && (
        <Form.Dropdown id="domain" title="Append Domain" defaultValue={domains[0]}>
          <Form.Dropdown.Item value="" title="None (Use exact inputs)" />
          {domains.map((dom) => (
            <Form.Dropdown.Item key={dom} value={dom} title={`@${dom}`} />
          ))}
        </Form.Dropdown>
      )}

      {action === "add" && (
        <Form.Dropdown id="role" title="Permission Role" defaultValue="editor">
          <Form.Dropdown.Item value="reader" title="Viewer (Reader)" />
          <Form.Dropdown.Item value="commenter" title="Commenter" />
          <Form.Dropdown.Item value="editor" title="Editor" />
          <Form.Dropdown.Item value="owner" title="Transfer Direct File Ownership" />
        </Form.Dropdown>
      )}
    </Form>
  );
}

// ==========================================
// 4. SEARCH & AUDIT DRIVE FILES SUB-VIEW
// ==========================================
function SearchDriveFilesView() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<string | null>(null);
  const domains = getConfiguredDomains();

  async function handleSubmit(values: { userTarget: string; query: string; domain?: string }) {
    const gamReady = await ensureGamOrInstall();
    if (!gamReady) return;

    if (!values.userTarget?.trim() || !values.query?.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Missing Search Query or User" });
      return;
    }

    let user = values.userTarget.trim();
    if (values.domain && !user.includes("@")) {
      user = `${user}@${values.domain}`;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: `Searching ${user}'s Drive...` });

    try {
      const cleanQuery = values.query.replace(/'/g, "\\'");
      const cmd = `user ${user} print drivefiles query "${cleanQuery}" fields id,name,mimeType,shared`;

      const output = await runGam(cmd);
      setSearchResults(output);

      toast.style = Toast.Style.Success;
      toast.title = "Search Completed";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Search Failed";
      toast.message = (error as Error)?.message || String(error);
    } finally {
      setIsLoading(false);
    }
  }

  if (searchResults) {
    return (
      <Detail
        markdown={`# Search Results\n\n\`\`\`csv\n${searchResults}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action title="Run Another Search" onAction={() => setSearchResults(null)} />
            <Action.CopyToClipboard title="Copy Raw CSV Output" content={searchResults} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Execute Drive Search" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="userTarget" title="User Target" placeholder="j.doe" />
      {domains.length > 0 && (
        <Form.Dropdown id="domain" title="Append Domain" defaultValue={domains[0]}>
          <Form.Dropdown.Item value="" title="None (Use exact input)" />
          {domains.map((dom) => (
            <Form.Dropdown.Item key={dom} value={dom} title={`@${dom}`} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Separator />
      <Form.TextField id="query" title="Drive Query" placeholder="name contains 'Budget' and trashed = false" />
    </Form>
  );
}

// ==========================================
// 5. PURGE USER FILES SUB-VIEW
// ==========================================
function PurgeDriveView() {
  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<"purge_file_id" | "purge_query" | "empty_trash">("empty_trash");
  const domains = getConfiguredDomains();

  async function handleSubmit(values: {
    userTarget: string;
    domain?: string;
    action: "purge_file_id" | "purge_query" | "empty_trash";
    targetInput?: string;
  }) {
    const gamReady = await ensureGamOrInstall();
    if (!gamReady) return;

    if (!values.userTarget?.trim()) {
      showToast({ style: Toast.Style.Failure, title: "User Target Required" });
      return;
    }

    let user = values.userTarget.trim();
    if (values.domain && !user.includes("@")) {
      user = `${user}@${values.domain}`;
    }

    const input = values.targetInput?.trim();
    if (action !== "empty_trash" && !input) {
      showToast({ style: Toast.Style.Failure, title: "Target Input Required" });
      return;
    }

    setIsLoading(true);

    try {
      let cmd = "";
      if (action === "empty_trash") {
        cmd = `user ${user} empty drivetrash`;
      } else if (action === "purge_file_id") {
        cmd = `user ${user} purge drivefile ${input}`;
      } else if (action === "purge_query") {
        const cleanQuery = input ? input.replace(/'/g, "\\'") : "";
        cmd = `user ${user} delete drivefile query "${cleanQuery}" purge`;
      }

      await runCommandInTerminal(cmd);

      await showToast({
        style: Toast.Style.Success,
        title: "Opened Terminal",
        message: `Executing purge for ${user}...`,
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
          <Action.SubmitForm title="Run Purge in Terminal" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="userTarget" title="Target User" placeholder="j.doe" />
      {domains.length > 0 && (
        <Form.Dropdown id="domain" title="Append Domain" defaultValue={domains[0]}>
          <Form.Dropdown.Item value="" title="None (Use exact input)" />
          {domains.map((dom) => (
            <Form.Dropdown.Item key={dom} value={dom} title={`@${dom}`} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Dropdown
        id="action"
        title="Purge Action"
        value={action}
        onChange={(val) => setAction(val as typeof action)}
      >
        <Form.Dropdown.Item value="empty_trash" title="Empty User Drive Trash" />
        <Form.Dropdown.Item value="purge_file_id" title="Purge File by ID" />
        <Form.Dropdown.Item value="purge_query" title="Purge Files Matching Search Query" />
      </Form.Dropdown>

      {action === "purge_file_id" && <Form.TextField id="targetInput" title="File ID" placeholder="1A2b3C4d5E..." />}

      {action === "purge_query" && (
        <Form.TextField id="targetInput" title="Search Query" placeholder="name = 'Old_Export.csv'" />
      )}
    </Form>
  );
}

// ==========================================
// 6. MANAGE GROUP DRIVE SUB-VIEW
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
