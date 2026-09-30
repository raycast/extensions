import { ActionPanel, Action, List, confirmAlert, Alert, Keyboard, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchAppStoreConnect, useAppStoreConnectApi } from "./Hooks/useAppStoreConnect";
import { UserInvitation, userInvitationsSchemas } from "./Model/schemas";
import SignIn from "./Components/SignIn";
import { usersSchema, User } from "./Model/schemas";
import InviteTeamMember from "./Components/InviteTeamMember";
import { presentError } from "./Utils/utils";
import EditTeamMember from "./Components/EditTeamMember";

export default function Command() {
  const [path, setPath] = useState<string | undefined>(undefined);
  const [invitedPath, setInvitedPath] = useState<string | undefined>(undefined);

  const {
    data: fetchedUsers,
    isLoading,
    pagination,
  } = useAppStoreConnectApi(path, (response) => {
    return usersSchema.safeParse(response.data).data ?? null;
  });

  const { data: fetchedInvited, isLoading: isLoadingInvited } = useAppStoreConnectApi(invitedPath, (response) => {
    return userInvitationsSchemas.safeParse(response.data).data ?? null;
  });

  const [allUsers, setAllUsers] = useState<User[]>(fetchedUsers ?? []);

  const [allInvitedUsers, setAllInvitedUsers] = useState<UserInvitation[]>(fetchedInvited ?? []);

  useEffect(() => {
    setAllInvitedUsers(fetchedInvited ?? []);
  }, [fetchedInvited]);

  useEffect(() => {
    const foundedUsers: User[] = [];
    for (const user of fetchedUsers ?? []) {
      if (foundedUsers.find((u) => u.id === user.id)) {
        continue;
      }
      foundedUsers.push(user);
    }
    setAllUsers(foundedUsers);
  }, [fetchedUsers]);

  /**
   * Apple refuses to remove the Account Holder — the role can only be transferred, from
   * App Store Connect, by the holder themselves. Offering a Remove action that always
   * fails is worse than not offering it, and this is also the case where a user is most
   * likely looking at their OWN row: an API key has no user identity, so "is this me?"
   * cannot be answered, but "can this person be removed at all?" can.
   */
  const isAccountHolder = (user: User) => user.attributes.roles.includes("ACCOUNT_HOLDER");

  const allowedRoles = [
    "ADMIN",
    "APP_MANAGER",
    "CUSTOMER_SUPPORT",
    "DEVELOPER",
    "FINANCE",
    "MARKETING",
    "SALES",
    "ACCOUNT_HOLDER",
  ];

  const rolesString = (roles: string[]) => {
    if (roles.length === 0) {
      return "";
    }
    const allowedRolesString = roles
      .filter((role) => allowedRoles.includes(role))
      .map((role) => {
        const lowerCase = role.toLowerCase();
        const capitalized = lowerCase.charAt(0).toUpperCase() + lowerCase.slice(1);
        const replaceUnderscore = capitalized.replace("_", " ");
        return replaceUnderscore;
      })
      .join(", ");
    if (allowedRolesString.length > 0) {
      return allowedRolesString;
    }
    return "";
  };

  // Accepts an invitation too: both carry the same name fields, and both need a title
  // for their ActionPanel section.
  const makeTitle = (user: User | UserInvitation) => {
    const firstName = JSON.stringify(user.attributes.firstName ?? "");
    const lastName = JSON.stringify(user.attributes.lastName ?? "");
    return `${JSON.parse(firstName)} ${JSON.parse(lastName)}`.trim();
  };

  const inviteAction = () => {
    return (
      <Action.Push
        title="Invite Team Member"
        icon={Icon.AddPerson}
        shortcut={Keyboard.Shortcut.Common.New}
        target={
          <InviteTeamMember
            didInviteNewUser={(user) => {
              setAllInvitedUsers([...allInvitedUsers, user]);
            }}
          />
        }
      />
    );
  };

  const copyAction = (user: User | UserInvitation) => {
    return (
      <>
        <Action.CopyToClipboard
          title="Copy Name"
          shortcut={Keyboard.Shortcut.Common.Copy}
          content={user.attributes.firstName + " " + user.attributes.lastName}
        />
        <Action.CopyToClipboard
          title="Copy Email"
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          content={user.type === "userInvitations" ? user.attributes.email : user.attributes.username}
        />
      </>
    );
  };

  return (
    <SignIn
      didSignIn={() => {
        setPath("/users");
        setInvitedPath("/userInvitations");
      }}
    >
      <List
        isLoading={isLoading || isLoadingInvited}
        pagination={pagination}
        actions={<ActionPanel>{inviteAction()}</ActionPanel>}
      >
        {(allInvitedUsers || []).length > 0 && (
          <List.Section title="Invited">
            {allInvitedUsers.map((user: UserInvitation) => (
              <List.Item
                key={user.id}
                title={makeTitle(user)}
                subtitle={user.attributes.email}
                accessories={[{ text: rolesString(user.attributes.roles), tooltip: "Roles" }]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title={makeTitle(user)}>
                      {copyAction(user)}
                      <Action
                        title="Revoke"
                        icon={Icon.Trash}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        style={Action.Style.Destructive}
                        onAction={async () => {
                          if (
                            await confirmAlert({
                              title: `Revoke the invitation for ${makeTitle(user)}?`,
                              message: `${user.attributes.email} will no longer be able to join this team with this invitation.`,
                              primaryAction: { title: "Revoke", style: Alert.ActionStyle.Destructive },
                            })
                          ) {
                            const revoked = allInvitedUsers.find((u) => u.id === user.id);
                            try {
                              setAllInvitedUsers(allInvitedUsers.filter((u) => u.id !== user.id));
                              await fetchAppStoreConnect(`/userInvitations/${user.id}`, "DELETE");
                            } catch (error) {
                              if (revoked) {
                                setAllInvitedUsers([...allInvitedUsers, revoked]);
                              }
                              presentError(error);
                            }
                          }
                        }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>{inviteAction()}</ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}
        <List.Section title="Team members">
          {allUsers?.map((user: User) => (
            <List.Item
              title={makeTitle(user)}
              key={user.id}
              subtitle={user.attributes.username}
              accessories={[
                {
                  text: rolesString(user.attributes.roles),
                  tooltip: isAccountHolder(user)
                    ? "Roles — the Account Holder can't be removed. Transfer the role in App Store Connect first."
                    : "Roles",
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title={makeTitle(user)}>
                    <Action.Push
                      title="Edit User"
                      icon={Icon.Person}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      target={
                        <EditTeamMember
                          user={user}
                          userChanged={(newUser) => {
                            setAllUsers(
                              allUsers.map((user) => {
                                if (user.id === newUser.id) {
                                  return newUser;
                                }
                                return user;
                              }),
                            );
                          }}
                        />
                      }
                    />
                    {copyAction(user)}
                    {!isAccountHolder(user) && (
                      <Action
                        title="Remove"
                        icon={Icon.Trash}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        style={Action.Style.Destructive}
                        onAction={async () => {
                          if (
                            await confirmAlert({
                              title: `Remove ${makeTitle(user)}?`,
                              message: `${user.attributes.username} will lose access to this App Store Connect team.`,
                              primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                            })
                          ) {
                            const removed = allUsers.find((u) => u.id === user.id);
                            try {
                              setAllUsers(allUsers.filter((u) => u.id !== user.id));
                              await fetchAppStoreConnect(`/users/${user.id}`, "DELETE");
                            } catch (error) {
                              if (removed) {
                                setAllUsers([...allUsers, removed]);
                              }
                              presentError(error);
                            }
                          }
                        }}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>{inviteAction()}</ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    </SignIn>
  );
}
