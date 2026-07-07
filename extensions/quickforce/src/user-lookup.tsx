import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  Color,
  confirmAlert,
  Detail,
  Icon,
  LaunchProps,
  List,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import {
  openOrgToPage,
  searchUsers,
  getUserLoginHistory,
  resetUserPassword,
  toggleUserActive,
  toggleUserFreeze,
  SalesforceUser,
  LoginHistoryEntry,
} from "./lib/sfdx";
import { formatDate } from "./lib/utils";
import { OrgListDropdown, useDefaultOrgSelection } from "./org-dropdown";

function getStatusColor(isActive: boolean): Color {
  return isActive ? Color.Green : Color.Red;
}

// The user detail page in Setup, where profile, role, and permissions are managed
function userSetupPath(userId: string): string {
  return `/lightning/setup/ManageUsers/page?address=${encodeURIComponent(`/${userId}?noredirect=1&isUserEntityOverride=1`)}`;
}

// Impersonates a user via Salesforce's servlet.su endpoint; success depends on the
// org's "Administrators Can Log in as Any User" setting / user-granted access
function loginAsPath(orgId: string, userId: string): string {
  const retUrl = encodeURIComponent("/lightning/setup/ManageUsers/home");
  const targetUrl = encodeURIComponent("/lightning/page/home");
  return `/servlet/servlet.su?oid=${orgId}&suorgadminid=${userId}&retURL=${retUrl}&targetURL=${targetUrl}`;
}

async function openUserInSalesforce(userId: string, orgAlias: string) {
  await showToast({ style: Toast.Style.Animated, title: "Opening user in Salesforce…" });
  try {
    await openOrgToPage(orgAlias, "custom", userSetupPath(userId));
    await closeMainWindow({ popToRootType: PopToRootType.Suspended });
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to open user", message: String(error) });
  }
}

async function loginAsUser(user: SalesforceUser, orgAlias: string, orgId: string) {
  if (!orgId) {
    await showToast({ style: Toast.Style.Failure, title: "Missing org ID", message: "Could not resolve org ID" });
    return;
  }
  const confirmed = await confirmAlert({
    title: "Login as User?",
    message: `Open an impersonated Salesforce session for ${user.Name} (${user.Username})?`,
    primaryAction: {
      title: "Login as User",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) return;

  await showToast({ style: Toast.Style.Animated, title: `Logging in as ${user.Name}…` });
  try {
    await openOrgToPage(orgAlias, "custom", loginAsPath(orgId, user.Id));
    await closeMainWindow({ popToRootType: PopToRootType.Suspended });
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to log in as user", message: String(error) });
  }
}

// User Detail View Component
function UserDetailView({ user, orgAlias, orgId }: { user: SalesforceUser; orgAlias: string; orgId: string }) {
  const [isActive, setIsActive] = useState(user.IsActive);
  const [isFrozen, setIsFrozen] = useState(user.IsFrozen ?? false);
  const { data: loginHistory, isLoading } = useCachedPromise(getUserLoginHistory, [user.Id, orgAlias]);

  const userMarkdown = `
# ${user.Name}

## User Information

| Property | Value |
|:---------|:------|
| **Name** | ${user.Name} |
| **Username** | ${user.Username} |
| **Email** | ${user.Email || "N/A"} |
| **Phone** | ${user.Phone || "N/A"} |
| **Profile** | ${user.Profile?.Name || "Unknown"} |
| **Role** | ${user.UserRole?.Name || "None"} |
| **User Type** | ${user.UserType} |
| **Status** | ${isActive ? "Active" : "Inactive"} |
| **Login Frozen** | ${isFrozen ? "Yes" : "No"} |
| **Last Login** | ${formatDate(user.LastLoginDate)} |
| **Created** | ${new Date(user.CreatedDate).toLocaleString()} |

## Login History

${
  loginHistory && loginHistory.length > 0
    ? loginHistory
        .map(
          (login: LoginHistoryEntry) => `
**${new Date(login.LoginTime).toLocaleString()}**
- Status: ${login.Status}
- Type: ${login.LoginType}
- IP: ${login.SourceIp || "Unknown"}
- Browser: ${login.Browser || "Unknown"}
- Platform: ${login.Platform || "Unknown"}
`,
        )
        .join("\n")
    : "*No login history available*"
}
  `;

  async function handleResetPassword() {
    const confirmed = await confirmAlert({
      title: "Reset Password",
      message: `Force ${user.Name} to reset password on next login?\n\nEmail: ${user.Email}`,
      primaryAction: {
        title: "Reset Password",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await showToast({ style: Toast.Style.Animated, title: "Resetting password..." });
      try {
        await resetUserPassword(user.Id, orgAlias);
        await showToast({
          style: Toast.Style.Success,
          title: "Password Reset",
          message: `${user.Name} will be prompted to reset password on next login`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Reset Password",
          message: String(error),
        });
      }
    }
  }

  async function handleToggleUserActive() {
    const isActivating = !isActive;
    const action = isActivating ? "Activate" : "Deactivate";
    const confirmed = await confirmAlert({
      title: `${action} User`,
      message: `${action} the user record for ${user.Name}?`,
      primaryAction: {
        title: action,
        style: isActivating ? Alert.ActionStyle.Default : Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await showToast({
        style: Toast.Style.Animated,
        title: `${isActivating ? "Activating" : "Deactivating"} user...`,
      });
      try {
        const nextActive = await toggleUserActive(user.Id, isActive, orgAlias);
        setIsActive(nextActive);
        await showToast({
          style: Toast.Style.Success,
          title: "User Updated",
          message: `${user.Name} ${isActivating ? "activated" : "deactivated"} successfully`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to ${action.toLowerCase()} user`,
          message: String(error),
        });
      }
    }
  }

  async function handleToggleUserFreeze() {
    const isFreezing = !isFrozen;
    const action = isFreezing ? "Freeze" : "Unfreeze";
    const confirmed = await confirmAlert({
      title: `${action} User`,
      message: `${action} login access for ${user.Name}?`,
      primaryAction: {
        title: action,
        style: isFreezing ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      await showToast({ style: Toast.Style.Animated, title: `${isFreezing ? "Freezing" : "Unfreezing"} user...` });
      try {
        const nextFrozen = await toggleUserFreeze(user.Id, isFrozen, orgAlias);
        setIsFrozen(nextFrozen);
        await showToast({
          style: Toast.Style.Success,
          title: "User Updated",
          message: `${user.Name} ${isFreezing ? "frozen" : "unfrozen"} successfully`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to ${action.toLowerCase()} user`,
          message: String(error),
        });
      }
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={userMarkdown}
      actions={
        <ActionPanel>
          <Action
            title="Open in Salesforce"
            icon={Icon.Globe}
            onAction={() => openUserInSalesforce(user.Id, orgAlias)}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          {isActive && (
            <Action
              title="Login as User"
              icon={Icon.PersonCircle}
              onAction={() => loginAsUser(user, orgAlias, orgId)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            />
          )}
          <Action
            title={isFrozen ? "Unfreeze User" : "Freeze User"}
            icon={isFrozen ? Icon.LockUnlocked : Icon.Lock}
            onAction={handleToggleUserFreeze}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action
            title={isActive ? "Deactivate User" : "Activate User"}
            icon={isActive ? Icon.RemovePerson : Icon.AddPerson}
            style={isActive ? Action.Style.Destructive : Action.Style.Regular}
            onAction={handleToggleUserActive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          />
          <Action
            title="Reset Password"
            icon={Icon.Key}
            onAction={handleResetPassword}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.CopyToClipboard title="Copy User Id" content={user.Id} shortcut={{ modifiers: ["cmd"], key: "i" }} />
          <Action.CopyToClipboard
            title="Copy Username"
            content={user.Username}
            shortcut={{ modifiers: ["cmd"], key: "u" }}
          />
          <Action.CopyToClipboard title="Copy Email" content={user.Email} shortcut={{ modifiers: ["cmd"], key: "e" }} />
        </ActionPanel>
      }
    />
  );
}

// Main Command Component
export default function Command(props: LaunchProps<{ arguments: Arguments.UserLookup }>) {
  const [searchText, setSearchText] = useState(props.arguments.query ?? "");
  const { selectedOrg, setSelectedOrg, orgs } = useDefaultOrgSelection();

  const selectedOrgId = orgs?.find((o) => (o.alias || o.username) === selectedOrg)?.orgId ?? "";

  // Search with caching; under 2 characters we browse recently active users
  const {
    data: users,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (term: string, org: string) => {
      if (!org) return [];
      return await searchUsers(term.length >= 2 ? term : "", org);
    },
    [searchText, selectedOrg],
    {
      keepPreviousData: true,
      execute: selectedOrg !== "",
    },
  );

  async function handleResetPassword(user: SalesforceUser) {
    const confirmed = await confirmAlert({
      title: "Reset Password",
      message: `Force ${user.Name} to reset password on next login?\n\nEmail: ${user.Email}`,
      primaryAction: {
        title: "Reset Password",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await showToast({ style: Toast.Style.Animated, title: "Resetting password..." });
      try {
        await resetUserPassword(user.Id, selectedOrg);
        await showToast({
          style: Toast.Style.Success,
          title: "Password Reset",
          message: `${user.Name} will be prompted to reset password on next login`,
        });
        revalidate();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Reset Password",
          message: String(error),
        });
      }
    }
  }

  async function handleToggleUserActive(user: SalesforceUser) {
    const isActivating = !user.IsActive;
    const action = isActivating ? "Activate" : "Deactivate";
    const confirmed = await confirmAlert({
      title: `${action} User`,
      message: `${action} the user record for ${user.Name}?`,
      primaryAction: {
        title: action,
        style: isActivating ? Alert.ActionStyle.Default : Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await showToast({
        style: Toast.Style.Animated,
        title: `${isActivating ? "Activating" : "Deactivating"} user...`,
      });
      try {
        await toggleUserActive(user.Id, user.IsActive, selectedOrg);
        await showToast({
          style: Toast.Style.Success,
          title: "User Updated",
          message: `${user.Name} ${isActivating ? "activated" : "deactivated"} successfully`,
        });
        revalidate();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to ${action.toLowerCase()} user`,
          message: String(error),
        });
      }
    }
  }

  async function handleToggleUserFreeze(user: SalesforceUser) {
    const isFrozen = user.IsFrozen ?? false;
    const isFreezing = !isFrozen;
    const action = isFreezing ? "Freeze" : "Unfreeze";
    const confirmed = await confirmAlert({
      title: `${action} User`,
      message: `${action} login access for ${user.Name}?`,
      primaryAction: {
        title: action,
        style: isFreezing ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      await showToast({ style: Toast.Style.Animated, title: `${isFreezing ? "Freezing" : "Unfreezing"} user...` });
      try {
        await toggleUserFreeze(user.Id, isFrozen, selectedOrg);
        await showToast({
          style: Toast.Style.Success,
          title: "User Updated",
          message: `${user.Name} ${isFreezing ? "frozen" : "unfrozen"} successfully`,
        });
        revalidate();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to ${action.toLowerCase()} user`,
          message: String(error),
        });
      }
    }
  }

  const isSearching = searchText.length >= 2;

  const renderUserItem = (user: SalesforceUser) => {
    const accessories = [
      {
        tag: {
          value: user.IsActive ? "Active" : "Inactive",
          color: getStatusColor(user.IsActive),
        },
      },
      user.IsFrozen
        ? {
            tag: {
              value: "Frozen",
              color: Color.Orange,
            },
          }
        : undefined,
      user.Profile?.Name ? { text: user.Profile.Name } : undefined,
      user.LastLoginDate ? { text: formatDate(user.LastLoginDate) } : undefined,
      user.UserRole?.Name ? { text: user.UserRole.Name } : undefined,
    ].filter(Boolean) as List.Item.Accessory[];

    return (
      <List.Item
        key={user.Id}
        icon={{
          source: Icon.Person,
          tintColor: getStatusColor(user.IsActive),
        }}
        title={user.Name}
        subtitle={user.Username}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<UserDetailView user={user} orgAlias={selectedOrg} orgId={selectedOrgId} />}
            />
            <Action
              title="Open in Salesforce"
              icon={Icon.Globe}
              onAction={() => openUserInSalesforce(user.Id, selectedOrg)}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            {user.IsActive && (
              <Action
                title="Login as User"
                icon={Icon.PersonCircle}
                onAction={() => loginAsUser(user, selectedOrg, selectedOrgId)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              />
            )}
            <Action
              title={user.IsFrozen ? "Unfreeze User" : "Freeze User"}
              icon={user.IsFrozen ? Icon.LockUnlocked : Icon.Lock}
              onAction={() => handleToggleUserFreeze(user)}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
            <Action
              title={user.IsActive ? "Deactivate User" : "Activate User"}
              icon={user.IsActive ? Icon.RemovePerson : Icon.AddPerson}
              style={user.IsActive ? Action.Style.Destructive : Action.Style.Regular}
              onAction={() => handleToggleUserActive(user)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
            <Action
              title="Reset Password"
              icon={Icon.Key}
              onAction={() => handleResetPassword(user)}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action.CopyToClipboard
              title="Copy User Id"
              content={user.Id}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
            <Action.CopyToClipboard
              title="Copy Username"
              content={user.Username}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
            <Action.CopyToClipboard
              title="Copy Email"
              content={user.Email}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search users by name, email, or username..."
      throttle
      searchBarAccessory={<OrgListDropdown value={selectedOrg} onChange={setSelectedOrg} />}
    >
      {error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Search Failed"
          description={String(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      )}
      {!error && !selectedOrg && (
        <List.EmptyView
          icon={Icon.Globe}
          title="Select an Org"
          description="Choose a Salesforce org from the dropdown to start searching"
        />
      )}
      {!error && selectedOrg && !isLoading && users?.length === 0 && (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No Users Found"
          description={searchText.length >= 2 ? `No users found for "${searchText}"` : "No users to show in this org"}
        />
      )}
      {isSearching ? (
        <List.Section title="Search Results">{users?.map(renderUserItem)}</List.Section>
      ) : (
        <>
          <List.Section title="Recently Active Users">
            {users?.filter((user) => user.IsActive).map(renderUserItem)}
          </List.Section>
          <List.Section title="Inactive Users">
            {users?.filter((user) => !user.IsActive).map(renderUserItem)}
          </List.Section>
        </>
      )}
    </List>
  );
}
