import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Clipboard,
  open,
  showHUD,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { useExec } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";

// Minimal Org type.
type Org = {
  username: string;
  alias: string;
  orgId: string;
  instanceUrl: string;
};

// Salesforce User record type.
type UserRecord = {
  Id: string;
  Name: string;
  username: string;
  alias: string;
  email: string;
  profileName: string;
  roleName: string;
  lastLoginDate: string;
};

// Add this interface near the top (after your UserRecord type)
interface RawUserRecord extends Partial<UserRecord> {
  Profile?: { Name?: string; name?: string };
  UserRole?: { Name?: string; name?: string };
}

type QueryResult = {
  result: {
    records: UserRecord[];
  };
};

interface Preferences {
  searchLimit: string;
}

type UserStatusFilter = "Active" | "Inactive" | "All" | "All (Active)";

// Helper to format login date.
function formatLoginDate(dateStr: string): string {
  if (!dateStr) return "";
  const dt = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  };
  const formatted = dt.toLocaleString("en-CA", options);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `${formatted} (${tz})`;
}

export default function SalesforceUsersView({ org }: { org: Org }) {
  const targetOrg = org.alias || org.username;
  const preferences = getPreferenceValues<Preferences>();
  const limitValue = parseInt(preferences.searchLimit, 10) || 50;

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("Active");
  const [users, setUsers] = useState<UserRecord[]>([]);

  // Build the SOQL query, including LastLoginDate and UserRole.Name.
  const buildQuery = useCallback(() => {
    let baseQuery = `SELECT Id, Name, username, alias, email, Profile.Name, UserRole.Name, LastLoginDate FROM User`;
    if (statusFilter === "Active") {
      baseQuery += " WHERE isActive = true AND Profile.UserLicense.Name = 'Salesforce'";
    } else if (statusFilter === "Inactive") {
      baseQuery += " WHERE isActive = false AND Profile.UserLicense.Name = 'Salesforce'";
    } else if (statusFilter === "All (Active)") {
      baseQuery += " WHERE isActive = true";
    }
    const trimmed = searchText.trim();
    if (trimmed.length > 0) {
      const sanitized = trimmed.replace(/[^\w\s]/g, "");
      const condition = `(Name LIKE '%${sanitized}%' OR username LIKE '%${sanitized}%' OR Profile.Name LIKE '%${sanitized}%' OR alias LIKE '%${sanitized}%' OR email LIKE '%${sanitized}%')`;
      baseQuery += baseQuery.includes("WHERE") ? " AND " + condition : " WHERE " + condition;
    }
    baseQuery += ` LIMIT ${limitValue}`;
    return baseQuery;
  }, [statusFilter, searchText, limitValue]);

  const queryCommand = useCallback(() => {
    const soql = buildQuery();
    return `sf data query --query "${soql}" --json --target-org "${targetOrg}"`;
  }, [buildQuery, targetOrg]);

  // Execute the query.
  const { isLoading, data, revalidate } = useExec(queryCommand(), [], { shell: true });

  // Parse query results.
  useEffect(() => {
    async function parseUsers() {
      if (data) {
        try {
          const parsed: QueryResult = JSON.parse(data);
          const recs: UserRecord[] = parsed.result.records.map((record: RawUserRecord) => {
            return {
              Id: record.Id || "",
              Name: record.Name || "",
              username: record.Username || "",
              alias: record.Alias || "",
              email: record.Email || "",
              profileName: record.Profile ? (record.Profile.Name ?? record.Profile.name ?? "") : "",
              roleName: record.UserRole ? (record.UserRole.Name ?? record.UserRole.name ?? "") : "",
              lastLoginDate: record.LastLoginDate || record.lastLoginDate || "",
            };
          });
          // sort the recs in descending order by lastLoginDate – most recent first.
          recs.sort((a, b) => {
            const dateA = new Date(a.lastLoginDate).getTime();
            const dateB = new Date(b.lastLoginDate).getTime();
            return dateB - dateA; // descending order
          });
          setUsers(recs);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to parse query results",
            message: errorMessage,
          });
        }
      } else {
        setUsers([]);
      }
    }
    parseUsers();
  }, [data]);

  // Dropdown for status filter.
  const filterAccessory = (
    <List.Dropdown
      tooltip="Filter Users"
      onChange={(newValue) => setStatusFilter(newValue as UserStatusFilter)}
      value={statusFilter}
    >
      <List.Dropdown.Section title="Status">
        <List.Dropdown.Item value="Active" title="Active" />
        <List.Dropdown.Item value="Inactive" title="Inactive" />
        <List.Dropdown.Item value="All" title="All" />
        <List.Dropdown.Item value="All (Active)" title="All (Active)" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  // Action handlers.
  async function handleOpenUserRecord(user: UserRecord) {
    try {
      const relativePath = `/lightning/setup/ManageUsers/page?address=/${user.Id}?noredirect%3D1%26isUserEntityOverride%3D1`;
      const execPromise = promisify(exec);
      await execPromise(`sf org open -p "${relativePath}" --target-org "${targetOrg}"`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open User record",
        message: errorMessage,
      });
    }
  }

  async function handleLoginAsUser(user: UserRecord) {
    try {
      const fullUrl = `${org.instanceUrl}/servlet/servlet.su?oid=${org.orgId}&suorgadminid=${user.Id}&retURL=/&targetURL=%2Fhome%2Fhome.jsp`;
      await open(fullUrl);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to initiate Login as User",
        message: errorMessage,
      });
    }
  }

  async function handleCopy(key: keyof UserRecord, user: UserRecord, label: string) {
    Clipboard.copy(user[key]);
    showHUD(`${label} copied`);
  }

  // ------------------------------
  // Render the list with detail view.
  // ------------------------------
  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      navigationTitle="Salesforce Users"
      searchBarAccessory={filterAccessory}
      isShowingDetail
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
        </ActionPanel>
      }
    >
      <List.Section title="Users">
        {users.map((user) => {
          // Build the login URL for metadata link.
          const loginUrl = `${org.instanceUrl}/servlet/servlet.su?oid=${org.orgId}&suorgadminid=${user.Id}&retURL=/&targetURL=%2Fhome%2Fhome.jsp`;
          return (
            <List.Item
              key={user.Id}
              title={user.Name}
              subtitle={user.profileName}
              icon={Icon.Person}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Name" text={user.Name} />
                      <List.Item.Detail.Metadata.Label title="ID" text={user.Id} />
                      <List.Item.Detail.Metadata.Label title="Username" text={user.username} />
                      <List.Item.Detail.Metadata.Label title="Email" text={user.email} />
                      <List.Item.Detail.Metadata.Label title="Alias" text={user.alias} />
                      <List.Item.Detail.Metadata.Label title="Profile" text={user.profileName} />
                      <List.Item.Detail.Metadata.Label title="User Role" text={user.roleName} />
                      <List.Item.Detail.Metadata.Label title="Last Login" text={formatLoginDate(user.lastLoginDate)} />
                      <List.Item.Detail.Metadata.Link title="Login As" target={loginUrl} text="Login" />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Open User Record" icon={Icon.Globe} onAction={() => handleOpenUserRecord(user)} />
                    <Action title="Login as User" icon={Icon.Switch} onAction={() => handleLoginAsUser(user)} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Copy Id to Clipboard"
                      icon={Icon.Clipboard}
                      onAction={() => handleCopy("Id", user, "ID")}
                    />
                    <Action
                      title="Copy Username to Clipboard"
                      icon={Icon.Clipboard}
                      onAction={() => handleCopy("username", user, "Username")}
                    />
                    <Action
                      title="Copy Email to Clipboard"
                      icon={Icon.Clipboard}
                      onAction={() => handleCopy("email", user, "Email")}
                    />
                    <Action
                      title="Copy Alias to Clipboard"
                      icon={Icon.Clipboard}
                      onAction={() => handleCopy("alias", user, "Alias")}
                    />
                    <Action
                      title="Copy Last Login to Clipboard"
                      icon={Icon.Clipboard}
                      onAction={() => handleCopy("lastLoginDate", user, "Last Login")}
                    />
                    <Action
                      title="Copy User Role to Clipboard"
                      icon={Icon.Clipboard}
                      onAction={() => handleCopy("roleName", user, "User Role")}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {users.length === 0 && (
        <List.EmptyView
          icon={Icon.Person}
          title="No users found"
          description="Try adjusting the filter or search term."
        />
      )}
    </List>
  );
}
