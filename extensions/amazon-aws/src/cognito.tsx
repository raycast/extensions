import {
  GroupType,
  UserPoolDescriptionType,
  UserStatusType,
  UserType,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Image,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useState } from "react";
import { AwsAction } from "./components/common/action";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import {
  addCognitoUserToGroup,
  CreateUserInput,
  createCognitoUser,
  deleteCognitoUser,
  disableCognitoUser,
  enableCognitoUser,
  getCustomAttributes,
  getUserAttribute,
  poolUsesEmailAsUsername,
  poolUsesPhoneAsUsername,
  removeCognitoUserFromGroup,
  resetCognitoUserPassword,
  useCognitoGroups,
  useCognitoUserDetails,
  useCognitoUserGroups,
  useCognitoUserPoolDetails,
  useCognitoUserPools,
  useCognitoUsers,
} from "./hooks/use-cognito";
import { resourceToConsoleLink } from "./util";

export default function Cognito() {
  const { userPools, error, isLoading, revalidate } = useCognitoUserPools();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter user pools by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        userPools?.map((pool) => <CognitoUserPoolItem key={pool.Id} pool={pool} />)
      )}
    </List>
  );
}

function CognitoUserPoolItem({ pool }: { pool: UserPoolDescriptionType }) {
  if (!pool.Id) {
    return (
      <List.Item
        title={pool.Name || "Unknown Pool"}
        subtitle="Invalid pool - missing ID"
        icon={{ source: "aws-icons/c.png", mask: Image.Mask.RoundedRectangle }}
        accessories={[{ text: "Error", icon: Icon.Warning }]}
      />
    );
  }

  return (
    <List.Item
      key={pool.Id}
      title={pool.Name || ""}
      subtitle={pool.Id}
      icon={{ source: "aws-icons/c.png", mask: Image.Mask.RoundedRectangle }}
      actions={
        <ActionPanel>
          <Action.Push target={<CognitoUsers pool={pool} />} title="View Users" icon={Icon.Person} />
          <Action.Push target={<CognitoGroups pool={pool} />} title="View Groups" icon={Icon.TwoPeople} />
          <AwsAction.Console url={resourceToConsoleLink(pool.Id, "AWS::Cognito::UserPool")} />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Pool ID" content={pool.Id} />
            <AwsAction.ExportResponse response={pool} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        ...(pool.Status ? [{ text: pool.Status }] : []),
        ...(pool.LastModifiedDate ? [{ date: new Date(pool.LastModifiedDate) }] : []),
      ]}
    />
  );
}

function CognitoUsers({ pool }: { pool: UserPoolDescriptionType }) {
  const [searchText, setSearchText] = useState("");
  const filter = searchText ? `username ^= "${searchText}"` : undefined;
  const { users, error, isLoading, revalidate } = useCognitoUsers(pool.Id!, filter);

  if (!pool.Id) {
    return (
      <List isLoading={false} navigationTitle="Users">
        <List.EmptyView title="Invalid Pool" description="Pool ID is missing" icon={Icon.Warning} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${pool.Name} - Users`}
      searchBarPlaceholder="Search users by username..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : users?.length === 0 ? (
        <List.EmptyView
          title="No Users"
          description={searchText ? `No users matching "${searchText}"` : "No users in this pool"}
          icon={Icon.Person}
          actions={
            <ActionPanel>
              <Action.Push
                target={<CreateUserForm poolId={pool.Id!} poolName={pool.Name} onUserCreated={revalidate} />}
                title="Create User"
                icon={Icon.Plus}
              />
            </ActionPanel>
          }
        />
      ) : (
        users?.map((user) => <CognitoUserItem key={user.Username} user={user} pool={pool} revalidate={revalidate} />)
      )}
    </List>
  );
}

function CognitoUserItem({
  user,
  pool,
  revalidate,
}: {
  user: UserType;
  pool: UserPoolDescriptionType;
  revalidate: () => void;
}) {
  const email = getUserAttribute(user.Attributes, "email");
  const statusIcon = getUserStatusIcon(user.UserStatus);
  const enabledIcon = user.Enabled
    ? { source: Icon.CheckCircle, tintColor: Color.Green }
    : { source: Icon.XMarkCircle, tintColor: Color.Red };

  const handleToggleEnabled = useCallback(async () => {
    if (!pool.Id || !user.Username) return;

    if (user.Enabled) {
      await confirmAlert({
        icon: { source: Icon.PersonCircle, tintColor: Color.Orange },
        title: "Disable User?",
        message: `Disabling "${user.Username}" will prevent them from signing in. You can re-enable them later.`,
        primaryAction: {
          title: "Disable",
          style: Alert.ActionStyle.Destructive,
          onAction: async () => {
            await disableCognitoUser(pool.Id!, user.Username!);
            revalidate();
          },
        },
      });
    } else {
      await enableCognitoUser(pool.Id, user.Username);
      revalidate();
    }
  }, [pool.Id, user.Username, user.Enabled, revalidate]);

  const handleResetPassword = useCallback(async () => {
    if (!pool.Id || !user.Username) return;

    await confirmAlert({
      icon: { source: Icon.Key, tintColor: Color.Orange },
      title: "Reset Password?",
      message: `This will invalidate the current password for "${user.Username}" and trigger a password reset flow.`,
      primaryAction: {
        title: "Reset Password",
        onAction: async () => {
          await resetCognitoUserPassword(pool.Id!, user.Username!);
          revalidate();
        },
      },
    });
  }, [pool.Id, user.Username, revalidate]);

  const handleDeleteUser = useCallback(async () => {
    if (!pool.Id || !user.Username) return;

    await confirmAlert({
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: "Delete User?",
      message: `Are you sure you want to permanently delete "${user.Username}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          await deleteCognitoUser(pool.Id!, user.Username!);
          revalidate();
        },
      },
    });
  }, [pool.Id, user.Username, revalidate]);

  return (
    <List.Item
      key={user.Username}
      title={user.Username || ""}
      subtitle={email}
      icon={statusIcon}
      actions={
        <ActionPanel>
          <Action.Push
            target={<CognitoUserDetails user={user} pool={pool} revalidate={revalidate} />}
            title="View Details"
            icon={Icon.Eye}
          />
          <Action.Push
            target={<ManageUserGroups user={user} pool={pool} />}
            title="Manage Groups"
            icon={Icon.TwoPeople}
          />
          <Action.Push
            target={<CreateUserForm poolId={pool.Id!} poolName={pool.Name} onUserCreated={revalidate} />}
            title="Create User"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            title={user.Enabled ? "Disable User" : "Enable User"}
            icon={user.Enabled ? Icon.XMarkCircle : Icon.CheckCircle}
            onAction={handleToggleEnabled}
          />
          <Action title="Reset Password" icon={Icon.Key} onAction={handleResetPassword} />
          <AwsAction.Console url={resourceToConsoleLink(`${pool.Id}/${user.Username}`, "AWS::Cognito::User")} />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Username" content={user.Username || ""} />
            {email && <Action.CopyToClipboard title="Copy Email" content={email} />}
            <AwsAction.ExportResponse response={user} />
          </ActionPanel.Section>
          <Action
            title="Delete User"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={handleDeleteUser}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          />
        </ActionPanel>
      }
      accessories={[
        { icon: enabledIcon, tooltip: user.Enabled ? "Enabled" : "Disabled" },
        { text: user.UserStatus, tooltip: "User Status" },
        ...(user.UserLastModifiedDate ? [{ date: new Date(user.UserLastModifiedDate) }] : []),
      ]}
    />
  );
}

function CognitoUserDetails({
  user,
  pool,
  revalidate,
}: {
  user: UserType;
  pool: UserPoolDescriptionType;
  revalidate: () => void;
}) {
  const { user: userDetails, isLoading: detailsLoading } = useCognitoUserDetails(pool.Id!, user.Username!);
  const { groups, isLoading: groupsLoading } = useCognitoUserGroups(pool.Id!, user.Username!);

  const isLoading = detailsLoading || groupsLoading;
  const email = getUserAttribute(userDetails?.UserAttributes, "email");
  const emailVerified = getUserAttribute(userDetails?.UserAttributes, "email_verified");
  const phone = getUserAttribute(userDetails?.UserAttributes, "phone_number");
  const phoneVerified = getUserAttribute(userDetails?.UserAttributes, "phone_number_verified");
  const sub = getUserAttribute(userDetails?.UserAttributes, "sub");

  // Get custom attributes (those starting with "custom:")
  const customAttributes =
    userDetails?.UserAttributes?.filter((attr) => attr.Name?.startsWith("custom:")).map((attr) => ({
      name: attr.Name?.replace("custom:", "") || "",
      value: attr.Value || "",
      fullName: attr.Name || "",
    })) || [];

  const handleToggleEnabled = useCallback(async () => {
    if (!pool.Id || !user.Username) return;

    if (userDetails?.Enabled) {
      await confirmAlert({
        icon: { source: Icon.PersonCircle, tintColor: Color.Orange },
        title: "Disable User?",
        message: `Disabling "${user.Username}" will prevent them from signing in.`,
        primaryAction: {
          title: "Disable",
          style: Alert.ActionStyle.Destructive,
          onAction: async () => {
            await disableCognitoUser(pool.Id!, user.Username!);
            revalidate();
          },
        },
      });
    } else {
      await enableCognitoUser(pool.Id, user.Username);
      revalidate();
    }
  }, [pool.Id, user.Username, userDetails?.Enabled, revalidate]);

  const handleResetPassword = useCallback(async () => {
    if (!pool.Id || !user.Username) return;

    await confirmAlert({
      icon: { source: Icon.Key, tintColor: Color.Orange },
      title: "Reset Password?",
      message: `This will trigger a password reset flow for "${user.Username}".`,
      primaryAction: {
        title: "Reset Password",
        onAction: async () => {
          await resetCognitoUserPassword(pool.Id!, user.Username!);
        },
      },
    });
  }, [pool.Id, user.Username]);

  return (
    <List isLoading={isLoading} navigationTitle={`User: ${user.Username}`}>
      <List.Section title="User Information">
        <List.Item title="Username" accessories={[{ text: user.Username }]} icon={Icon.Person} />
        <List.Item
          title="Status"
          accessories={[{ text: userDetails?.UserStatus, icon: getUserStatusIcon(userDetails?.UserStatus) }]}
          icon={Icon.Info}
        />
        <List.Item
          title="Enabled"
          accessories={[
            {
              text: userDetails?.Enabled ? "Yes" : "No",
              icon: userDetails?.Enabled
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : { source: Icon.XMarkCircle, tintColor: Color.Red },
            },
          ]}
          icon={Icon.Power}
          actions={
            <ActionPanel>
              <Action
                title={userDetails?.Enabled ? "Disable User" : "Enable User"}
                icon={userDetails?.Enabled ? Icon.XMarkCircle : Icon.CheckCircle}
                onAction={handleToggleEnabled}
              />
            </ActionPanel>
          }
        />
        {sub && <List.Item title="Sub (ID)" accessories={[{ text: sub }]} icon={Icon.Key} />}
      </List.Section>

      <List.Section title="Contact">
        {email && (
          <List.Item
            title="Email"
            accessories={[
              { text: email },
              {
                icon: emailVerified === "true" ? Icon.CheckCircle : Icon.XMarkCircle,
                tooltip: emailVerified === "true" ? "Verified" : "Not verified",
              },
            ]}
            icon={Icon.Envelope}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Email" content={email} />
              </ActionPanel>
            }
          />
        )}
        {phone && (
          <List.Item
            title="Phone"
            accessories={[
              { text: phone },
              {
                icon: phoneVerified === "true" ? Icon.CheckCircle : Icon.XMarkCircle,
                tooltip: phoneVerified === "true" ? "Verified" : "Not verified",
              },
            ]}
            icon={Icon.Phone}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Phone" content={phone} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      {customAttributes.length > 0 && (
        <List.Section title="Custom Attributes">
          {customAttributes.map((attr) => (
            <List.Item
              key={attr.fullName}
              title={attr.name}
              accessories={[{ text: attr.value }]}
              icon={Icon.Tag}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title={`Copy ${attr.name}`} content={attr.value} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title={`Groups (${groups?.length || 0})`}>
        {groups && groups.length > 0 ? (
          groups.map((group) => (
            <List.Item
              key={group.GroupName}
              title={group.GroupName || ""}
              subtitle={group.Description}
              icon={Icon.TwoPeople}
            />
          ))
        ) : (
          <List.Item title="No groups" subtitle="User is not a member of any groups" icon={Icon.TwoPeople} />
        )}
      </List.Section>

      <List.Section title="Timestamps">
        {userDetails?.UserCreateDate && (
          <List.Item
            title="Created"
            accessories={[{ date: new Date(userDetails.UserCreateDate) }]}
            icon={Icon.Calendar}
          />
        )}
        {userDetails?.UserLastModifiedDate && (
          <List.Item
            title="Last Modified"
            accessories={[{ date: new Date(userDetails.UserLastModifiedDate) }]}
            icon={Icon.Clock}
          />
        )}
      </List.Section>

      <List.Section title="Actions">
        <List.Item
          title="Reset Password"
          icon={Icon.Key}
          actions={
            <ActionPanel>
              <Action title="Reset Password" icon={Icon.Key} onAction={handleResetPassword} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Manage Groups"
          icon={Icon.TwoPeople}
          actions={
            <ActionPanel>
              <Action.Push
                target={<ManageUserGroups user={user} pool={pool} />}
                title="Manage Groups"
                icon={Icon.TwoPeople}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function CognitoGroups({ pool }: { pool: UserPoolDescriptionType }) {
  const { groups, error, isLoading } = useCognitoGroups(pool.Id!);

  if (!pool.Id) {
    return (
      <List isLoading={false} navigationTitle="Groups">
        <List.EmptyView title="Invalid Pool" description="Pool ID is missing" icon={Icon.Warning} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${pool.Name} - Groups`}
      searchBarPlaceholder="Filter groups by name..."
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : groups?.length === 0 ? (
        <List.EmptyView title="No Groups" description="No groups in this pool" icon={Icon.TwoPeople} />
      ) : (
        groups?.map((group) => <CognitoGroupItem key={group.GroupName} group={group} pool={pool} />)
      )}
    </List>
  );
}

function CognitoGroupItem({ group, pool }: { group: GroupType; pool: UserPoolDescriptionType }) {
  return (
    <List.Item
      key={group.GroupName}
      title={group.GroupName || ""}
      subtitle={group.Description}
      icon={Icon.TwoPeople}
      actions={
        <ActionPanel>
          <AwsAction.Console url={resourceToConsoleLink(pool.Id, "AWS::Cognito::UserPoolGroups")} />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Group Name" content={group.GroupName || ""} />
            {group.RoleArn && <Action.CopyToClipboard title="Copy Role ARN" content={group.RoleArn} />}
            <AwsAction.ExportResponse response={group} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        ...(group.Precedence !== undefined ? [{ text: `Precedence: ${group.Precedence}` }] : []),
        ...(group.LastModifiedDate ? [{ date: new Date(group.LastModifiedDate) }] : []),
      ]}
    />
  );
}

function ManageUserGroups({ user, pool }: { user: UserType; pool: UserPoolDescriptionType }) {
  const {
    groups: userGroups,
    isLoading: userGroupsLoading,
    revalidate,
  } = useCognitoUserGroups(pool.Id!, user.Username!);
  const { groups: allGroups, isLoading: allGroupsLoading } = useCognitoGroups(pool.Id!);

  const isLoading = userGroupsLoading || allGroupsLoading;
  const userGroupNames = new Set(userGroups?.map((g) => g.GroupName) || []);
  const availableGroups = allGroups?.filter((g) => !userGroupNames.has(g.GroupName)) || [];

  const handleRemoveFromGroup = useCallback(
    async (groupName: string) => {
      if (!pool.Id || !user.Username) return;

      await confirmAlert({
        icon: { source: Icon.TwoPeople, tintColor: Color.Orange },
        title: "Remove from Group?",
        message: `Remove "${user.Username}" from group "${groupName}"?`,
        primaryAction: {
          title: "Remove",
          style: Alert.ActionStyle.Destructive,
          onAction: async () => {
            await removeCognitoUserFromGroup(pool.Id!, user.Username!, groupName);
            revalidate();
          },
        },
      });
    },
    [pool.Id, user.Username, revalidate],
  );

  const handleAddToGroup = useCallback(
    async (groupName: string) => {
      if (!pool.Id || !user.Username) return;
      await addCognitoUserToGroup(pool.Id, user.Username, groupName);
      revalidate();
    },
    [pool.Id, user.Username, revalidate],
  );

  return (
    <List isLoading={isLoading} navigationTitle={`${user.Username} - Groups`}>
      <List.Section title="Current Groups">
        {userGroups && userGroups.length > 0 ? (
          userGroups.map((group) => (
            <List.Item
              key={group.GroupName}
              title={group.GroupName || ""}
              subtitle={group.Description}
              icon={{ source: Icon.TwoPeople, tintColor: Color.Green }}
              actions={
                <ActionPanel>
                  <Action
                    title="Remove from Group"
                    icon={Icon.Minus}
                    style={Action.Style.Destructive}
                    onAction={() => handleRemoveFromGroup(group.GroupName!)}
                  />
                </ActionPanel>
              }
            />
          ))
        ) : (
          <List.Item title="No groups" subtitle="User is not a member of any groups" icon={Icon.TwoPeople} />
        )}
      </List.Section>

      {availableGroups.length > 0 && (
        <List.Section title="Available Groups">
          {availableGroups.map((group) => (
            <List.Item
              key={group.GroupName}
              title={group.GroupName || ""}
              subtitle={group.Description}
              icon={{ source: Icon.TwoPeople, tintColor: Color.SecondaryText }}
              actions={
                <ActionPanel>
                  <Action title="Add to Group" icon={Icon.Plus} onAction={() => handleAddToGroup(group.GroupName!)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function CreateUserForm({
  poolId,
  poolName,
  onUserCreated,
}: {
  poolId: string;
  poolName?: string;
  onUserCreated: () => void;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pool, isLoading: poolLoading } = useCognitoUserPoolDetails(poolId);

  const usesEmailAsUsername = poolUsesEmailAsUsername(pool);
  const usesPhoneAsUsername = poolUsesPhoneAsUsername(pool);
  const customAttributes = getCustomAttributes(pool);

  const handleSubmit = useCallback(
    async (values: Record<string, string | boolean>) => {
      // Determine the actual username based on pool configuration
      let username = values.username as string;
      if (usesEmailAsUsername && values.email) {
        username = values.email as string;
      } else if (usesPhoneAsUsername && values.phoneNumber) {
        username = values.phoneNumber as string;
      }

      if (!username) {
        showToast({
          style: Toast.Style.Failure,
          title: usesEmailAsUsername ? "Missing email" : usesPhoneAsUsername ? "Missing phone" : "Missing username",
          message: usesEmailAsUsername
            ? "Email is required (used as username)"
            : usesPhoneAsUsername
              ? "Phone number is required (used as username)"
              : "Username is required",
        });
        return;
      }

      // Check required custom attributes
      for (const attr of customAttributes) {
        if (attr.required && !values[attr.name]) {
          showToast({
            style: Toast.Style.Failure,
            title: `Missing ${attr.displayName}`,
            message: `${attr.displayName} is required`,
          });
          return;
        }
      }

      // Collect custom attribute values
      const customAttrValues: Record<string, string> = {};
      for (const attr of customAttributes) {
        const value = values[attr.name] as string;
        if (value) {
          customAttrValues[attr.name] = value;
        }
      }

      setIsSubmitting(true);
      try {
        const userData: CreateUserInput = {
          username,
          email: usesEmailAsUsername ? undefined : (values.email as string) || undefined,
          phoneNumber: usesPhoneAsUsername ? undefined : (values.phoneNumber as string) || undefined,
          temporaryPassword: (values.temporaryPassword as string) || undefined,
          sendInvitation: values.sendInvitation as boolean,
          customAttributes: Object.keys(customAttrValues).length > 0 ? customAttrValues : undefined,
        };

        await createCognitoUser(poolId, userData);
        onUserCreated();
        pop();
      } catch {
        // Error is already handled in createCognitoUser
      } finally {
        setIsSubmitting(false);
      }
    },
    [poolId, onUserCreated, pop, usesEmailAsUsername, usesPhoneAsUsername, customAttributes],
  );

  return (
    <Form
      isLoading={isSubmitting || poolLoading}
      navigationTitle={`Create User - ${poolName || poolId}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create User" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {usesEmailAsUsername ? (
        <Form.TextField id="email" title="Email (Username)" placeholder="john@example.com" autoFocus />
      ) : usesPhoneAsUsername ? (
        <Form.TextField id="phoneNumber" title="Phone Number (Username)" placeholder="+1234567890" autoFocus />
      ) : (
        <>
          <Form.TextField id="username" title="Username" placeholder="johndoe" autoFocus />
          <Form.TextField id="email" title="Email" placeholder="john@example.com" />
          <Form.TextField id="phoneNumber" title="Phone Number" placeholder="+1234567890" />
        </>
      )}

      {customAttributes.length > 0 && (
        <>
          <Form.Separator />
          <Form.Description title="Custom Attributes" text="Pool-specific attributes" />
          {customAttributes.map((attr) => (
            <Form.TextField
              key={attr.name}
              id={attr.name}
              title={`${attr.displayName}${attr.required ? " *" : ""}${!attr.mutable ? " (immutable)" : ""}`}
              placeholder={attr.required ? "Required" : "Optional"}
              info={!attr.mutable ? "Cannot be changed after user creation" : undefined}
            />
          ))}
        </>
      )}

      <Form.Separator />
      <Form.PasswordField
        id="temporaryPassword"
        title="Temporary Password"
        placeholder="Leave empty for auto-generated"
      />
      <Form.Checkbox id="sendInvitation" label="Send invitation email" defaultValue={true} />
      <Form.Description text="If a temporary password is set and invitation is disabled, the user must be told their password manually." />
    </Form>
  );
}

function getUserStatusIcon(status?: UserStatusType | string): { source: Icon; tintColor: Color } {
  switch (status) {
    case "CONFIRMED":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "FORCE_CHANGE_PASSWORD":
      return { source: Icon.Key, tintColor: Color.Orange };
    case "UNCONFIRMED":
      return { source: Icon.Clock, tintColor: Color.Yellow };
    case "RESET_REQUIRED":
      return { source: Icon.Warning, tintColor: Color.Red };
    case "ARCHIVED":
      return { source: Icon.Bookmark, tintColor: Color.SecondaryText };
    case "COMPROMISED":
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    case "UNKNOWN":
    default:
      return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
  }
}
