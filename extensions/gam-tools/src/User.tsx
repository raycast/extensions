import { Action, ActionPanel, Detail, Form, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { getConfiguredDomains } from "./utils/preferences";
import { ensureGamOrInstall } from "./utils/setupGam";
import { runGam } from "./utils/gam";

// ==========================================
// MAIN USER HUB MENU
// ==========================================
export default function Command() {
  return (
    <List searchBarPlaceholder="Select a user management action...">
      <List.Section title="User Directory And Management">
        <List.Item
          icon="../assets/list-persons.png"
          title="List Domain Users"
          subtitle="View all users in the domain"
          actions={
            <ActionPanel>
              <Action.Push title="Open User List" target={<ListUsersView />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon="../assets/info-person.png"
          title="Get User Info"
          subtitle="Fetch details for a target user"
          actions={
            <ActionPanel>
              <Action.Push title="Open Info Tool" target={<GetUserInfoView />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon="../assets/add-person-badge.png"
          title="Create User"
          subtitle="Provision a new domain account"
          actions={
            <ActionPanel>
              <Action.Push title="Open Provisioning Form" target={<CreateUserView />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon="../assets/edit-person.png"
          title="Update User"
          subtitle="Modify identity, password, or security settings"
          actions={
            <ActionPanel>
              <Action.Push title="Open Update Form" target={<UpdateUserView />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon="../assets/delete-person.png"
          title="Suspend / Unsuspend User"
          subtitle="Change account active status"
          actions={
            <ActionPanel>
              <Action.Push title="Open Action Form" target={<SuspendUserView />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon="../assets/delegate-person.png"
          title="Manage Mailbox Delegation"
          subtitle="Add, remove, or clear all email account delegates"
          actions={
            <ActionPanel>
              <Action.Push title="Open Delegation Form" target={<DelegateUserView />} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// ==========================================
// 1. LIST USERS SUB-VIEW
// ==========================================
function ListUsersView() {
  const [users, setUsers] = useState<{ email: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      const gamReady = await ensureGamOrInstall();
      if (!gamReady) return;

      try {
        const csvOutput = await runGam("print users fields primaryEmail");
        const lines = csvOutput.split("\n").slice(1);
        const parsedUsers = lines
          .map((line) => line.trim())
          .filter(Boolean)
          .map((email) => ({ email }));

        setUsers(parsedUsers);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch users",
          message: (error as Error)?.message || String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchUsers();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter domain users...">
      {users.map((user) => (
        <List.Item
          key={user.email}
          title={user.email}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={user.email} title="Copy Email" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// ==========================================
// 2. GET USER INFO SUB-VIEW
// ==========================================
function GetUserInfoView() {
  const [userInfo, setUserInfo] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const domains = getConfiguredDomains();

  async function handleSubmit(values: { emailInput: string; domain?: string }) {
    const gamReady = await ensureGamOrInstall();
    if (!gamReady) return;

    if (!values.emailInput?.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Missing Email" });
      return;
    }

    let searchEmail = values.emailInput.trim();
    if (values.domain && !searchEmail.includes("@")) {
      searchEmail = `${searchEmail}@${values.domain}`;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Fetching info for ${searchEmail}...`,
    });

    try {
      const output = await runGam(`info user ${searchEmail}`);
      setUserInfo(output);
      setTargetEmail(searchEmail);

      toast.style = Toast.Style.Success;
      toast.title = "User Details Loaded";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Fetch User Info";
      toast.message = (error as Error)?.message || String(error);
    } finally {
      setIsLoading(false);
    }
  }

  if (userInfo) {
    return (
      <Detail
        markdown={`# Account Information: ${targetEmail}\n\n\`\`\`yaml\n${userInfo}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action title="Search Another User" onAction={() => setUserInfo(null)} />
            <Action.CopyToClipboard title="Copy Raw Details" content={userInfo} />
            <Action.CopyToClipboard title="Copy User Email" content={targetEmail} />
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
          <Action.SubmitForm title="Fetch User Details" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="emailInput" title="User Email" placeholder="username" />
      {domains.length > 0 && (
        <Form.Dropdown id="domain" title="Append Domain" defaultValue={domains[0]}>
          <Form.Dropdown.Item value="" title="None (Use exact input above)" />
          {domains.map((dom) => (
            <Form.Dropdown.Item key={dom} value={dom} title={`@${dom}`} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}

// ==========================================
// 3. CREATE USER SUB-VIEW
// ==========================================
function CreateUserView() {
  const [isLoading, setIsLoading] = useState(false);
  const [orgUnits, setOrgUnits] = useState<string[]>([]);
  const [isFetchingOUs, setIsFetchingOUs] = useState(true);
  const { pop } = useNavigation();
  const domains = getConfiguredDomains();

  useEffect(() => {
    async function fetchOrgUnits() {
      try {
        const csvOutput = await runGam("print ous fields orgUnitPath");
        const lines = csvOutput.split("\n").slice(1);
        const parsedOUs = lines.map((line) => line.trim().replace(/^"|"$/g, "")).filter(Boolean);

        if (!parsedOUs.includes("/")) parsedOUs.unshift("/");
        setOrgUnits(parsedOUs);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Fetch OUs",
          message: (error as Error)?.message || String(error),
        });
      } finally {
        setIsFetchingOUs(false);
      }
    }
    fetchOrgUnits();
  }, []);

  async function handleSubmit(values: {
    emailInput: string;
    domain?: string;
    firstName: string;
    lastName: string;
    password: string;
    orgUnit?: string;
  }) {
    const gamReady = await ensureGamOrInstall();
    if (!gamReady) return;

    let email = values.emailInput?.trim();
    if (values.domain && !email.includes("@")) {
      email = `${email}@${values.domain}`;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating User..." });

    try {
      let cmd = `create user ${email} firstname "${values.firstName}" lastname "${values.lastName}" password "${values.password}"`;
      if (values.orgUnit && values.orgUnit !== "/") {
        cmd += ` ou "${values.orgUnit.trim()}"`;
      }

      await runGam(cmd);
      toast.style = Toast.Style.Success;
      toast.title = "User Created";
      toast.message = `Successfully provisioned ${email}`;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Create User";
      toast.message = (error as Error)?.message || String(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || isFetchingOUs}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Provision User" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="emailInput" title="User Prefix / Email" placeholder="j.doe" />
      {domains.length > 0 && (
        <Form.Dropdown id="domain" title="Append Domain" defaultValue={domains[0]}>
          <Form.Dropdown.Item value="" title="None (Use exact input)" />
          {domains.map((dom) => (
            <Form.Dropdown.Item key={dom} value={dom} title={`@${dom}`} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField id="firstName" title="First Name" placeholder="Jane" />
      <Form.TextField id="lastName" title="Last Name" placeholder="Doe" />
      <Form.PasswordField id="password" title="Initial Password" placeholder="••••••••" />
      <Form.Dropdown id="orgUnit" title="Organizational Unit (OU)" defaultValue="/">
        {orgUnits.map((ouPath) => (
          <Form.Dropdown.Item key={ouPath} value={ouPath} title={ouPath === "/" ? "/ (Root OU)" : ouPath} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

// ==========================================
// 4. UPDATE USER SUB-VIEW
// ==========================================
function UpdateUserView() {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const domains = getConfiguredDomains();

  async function handleSubmit(values: Record<string, unknown>) {
    const gamReady = await ensureGamOrInstall();
    if (!gamReady) return;

    const emailInput = (values.emailInput as string)?.trim();
    if (!emailInput) {
      showToast({ style: Toast.Style.Failure, title: "Email Required" });
      return;
    }

    let email = emailInput;
    if (values.domain && !email.includes("@")) {
      email = `${email}@${values.domain}`;
    }

    const args: string[] = [`update user ${email}`];
    if ((values.firstName as string)?.trim()) args.push(`firstname "${(values.firstName as string).trim()}"`);
    if ((values.lastName as string)?.trim()) args.push(`lastname "${(values.lastName as string).trim()}"`);
    if ((values.password as string)?.trim()) args.push(`password "${(values.password as string).trim()}"`);
    if ((values.orgUnit as string)?.trim()) args.push(`ou "${(values.orgUnit as string).trim()}"`);

    if (values.suspended && values.suspended !== "ignore") args.push(`suspended ${values.suspended}`);
    if (values.galStatus && values.galStatus !== "ignore") args.push(`gal ${values.galStatus}`);

    if (values.clearBackupCodes) args.push("deprovision backupcodes");
    if (values.turnOff2SV) args.push("turnoff2sv");

    if (args.length === 1) {
      showToast({ style: Toast.Style.Failure, title: "No Changes Specified" });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating User..." });

    try {
      await runGam(args.join(" "));
      toast.style = Toast.Style.Success;
      toast.title = "User Updated";
      toast.message = `Successfully modified ${email}`;
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
          <Action.SubmitForm title="Apply User Updates" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="emailInput" title="User Primary Target" placeholder="username" />
      {domains.length > 0 && (
        <Form.Dropdown id="domain" title="Append Domain" defaultValue={domains[0]}>
          <Form.Dropdown.Item value="" title="None (Use exact input)" />
          {domains.map((dom) => (
            <Form.Dropdown.Item key={dom} value={dom} title={`@${dom}`} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Separator />
      <Form.Description text="Profile & Identity Attributes" />
      <Form.TextField id="firstName" title="New First Name" placeholder="Optional" />
      <Form.TextField id="lastName" title="New Last Name" placeholder="Optional" />
      <Form.PasswordField id="password" title="New Password" placeholder="Leave blank to keep current" />
      <Form.TextField id="orgUnit" title="Organizational Unit (OU)" placeholder="/Department/Team" />
      <Form.Separator />
      <Form.Description text="Account & Directory Settings" />
      <Form.Dropdown id="suspended" title="Suspension Status" defaultValue="ignore">
        <Form.Dropdown.Item value="ignore" title="-- No Change --" />
        <Form.Dropdown.Item value="on" title="Suspend Account (On)" />
        <Form.Dropdown.Item value="off" title="Unsuspend Account (Off)" />
      </Form.Dropdown>
      <Form.Dropdown id="galStatus" title="Global Address List (GAL)" defaultValue="ignore">
        <Form.Dropdown.Item value="ignore" title="-- No Change --" />
        <Form.Dropdown.Item value="on" title="Show in Directory (On)" />
        <Form.Dropdown.Item value="off" title="Hide from Directory (Off)" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description text="Security & Authentication Resets" />
      <Form.Checkbox id="clearBackupCodes" label="Deprovision/Revoke 2SV Backup Codes" defaultValue={false} />
      <Form.Checkbox id="turnOff2SV" label="Turn Off 2-Step Verification (2SV)" defaultValue={false} />
    </Form>
  );
}

// ==========================================
// 5. SUSPEND USER SUB-VIEW
// ==========================================
function SuspendUserView() {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const domains = getConfiguredDomains();

  async function handleSubmit(values: { emailInput: string; domain?: string; action: "suspend" | "unsuspend" }) {
    const gamReady = await ensureGamOrInstall();
    if (!gamReady) return;

    let email = values.emailInput?.trim();
    if (values.domain && !email.includes("@")) {
      email = `${email}@${values.domain}`;
    }

    setIsLoading(true);
    const suspendFlag = values.action === "suspend" ? "on" : "off";

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${values.action === "suspend" ? "Suspending" : "Unsuspending"} user...`,
    });

    try {
      await runGam(`update user ${email} suspended ${suspendFlag}`);
      toast.style = Toast.Style.Success;
      toast.title = `User ${values.action === "suspend" ? "Suspended" : "Unsuspended"}`;
      toast.message = `${email} status updated.`;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Action Failed";
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
          <Action.SubmitForm title="Execute Action" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="emailInput" title="User Target" placeholder="username" />
      {domains.length > 0 && (
        <Form.Dropdown id="domain" title="Append Domain" defaultValue={domains[0]}>
          <Form.Dropdown.Item value="" title="None (Use exact input)" />
          {domains.map((dom) => (
            <Form.Dropdown.Item key={dom} value={dom} title={`@${dom}`} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown id="action" title="Account Action" defaultValue="suspend">
        <Form.Dropdown.Item value="suspend" title="Suspend Account" />
        <Form.Dropdown.Item value="unsuspend" title="Unsuspend (Reactivate) Account" />
      </Form.Dropdown>
    </Form>
  );
}

// ==========================================
// 6. MANAGE DELEGATE SUB-VIEW
// ==========================================
function DelegateUserView() {
  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<"add" | "delete" | "delete_all">("add");
  const { pop } = useNavigation();
  const domains = getConfiguredDomains();

  async function handleSubmit(values: {
    ownerInput: string;
    delegateInput?: string;
    domain?: string;
    action: "add" | "delete" | "delete_all";
  }) {
    const gamReady = await ensureGamOrInstall();
    if (!gamReady) return;

    if (!values.ownerInput?.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Missing Owner Email",
        message: "Provide the target mailbox owner account.",
      });
      return;
    }

    if (action !== "delete_all" && !values.delegateInput?.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Missing Delegate Email",
        message: "Provide the delegate user account.",
      });
      return;
    }

    let owner = values.ownerInput.trim();
    let delegate = values.delegateInput?.trim() || "";

    if (values.domain) {
      if (!owner.includes("@")) owner = `${owner}@${values.domain}`;
      if (delegate && !delegate.includes("@")) delegate = `${delegate}@${values.domain}`;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title:
        action === "delete_all"
          ? "Removing all delegates..."
          : `${action === "add" ? "Granting" : "Revoking"} delegation access...`,
    });

    try {
      let cmd = "";

      if (action === "delete_all") {
        // Syntax to remove every delegate from the target mailbox
        cmd = `user ${owner} delete delegates`;
      } else if (action === "add") {
        cmd = `user ${delegate} add delegate ${owner}`;
      } else {
        cmd = `user ${delegate} delete delegate ${owner}`;
      }

      await runGam(cmd);

      toast.style = Toast.Style.Success;
      if (action === "delete_all") {
        toast.title = "All Delegates Removed";
        toast.message = `Cleared all delegate access from ${owner}'s mailbox.`;
      } else {
        toast.title = action === "add" ? "Delegate Granted" : "Delegate Revoked";
        toast.message = `${delegate} ${action === "add" ? "can now access" : "no longer has access to"} ${owner}'s mailbox.`;
      }

      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Delegation Operation Failed";
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
          <Action.SubmitForm title="Execute Delegation Change" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="action"
        title="Delegation Action"
        value={action}
        onChange={(val) => setAction(val as "add" | "delete" | "delete_all")}
      >
        <Form.Dropdown.Item value="add" title="Grant Delegate Access" />
        <Form.Dropdown.Item value="delete" title="Revoke Single Delegate Access" />
        <Form.Dropdown.Item value="delete_all" title="Revoke ALL Delegates from Owner" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField id="ownerInput" title="Target Mailbox Owner" placeholder="j.smith (account to manage)" />

      {action !== "delete_all" && (
        <Form.TextField
          id="delegateInput"
          title="Delegate Account"
          placeholder="a.assistant (user gaining or losing access)"
        />
      )}

      {domains.length > 0 && (
        <Form.Dropdown id="domain" title="Append Domain" defaultValue={domains[0]}>
          <Form.Dropdown.Item value="" title="None (Use exact inputs)" />
          {domains.map((dom) => (
            <Form.Dropdown.Item key={dom} value={dom} title={`@${dom}`} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
