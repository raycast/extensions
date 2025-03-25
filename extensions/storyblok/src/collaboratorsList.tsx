import { List, Detail, ActionPanel, Action, Color, Icon } from "@raycast/api";
import { sbData } from "./utils/storyblokData";
import { space, spaceRole } from "./utils/types";
import { matchRole, capitalize } from "./utils/helpers";

type collaboratorsData = {
  space: space;
};

type rolesData = {
  space_roles: spaceRole[];
};

const assignRoleColor = (role: string) => {
  switch (role) {
    case "admin":
      return Color.Green;
    case "editor":
      return Color.Yellow;
    case "developer":
    case "designer":
      return Color.Blue;
    default:
      return Color.PrimaryText;
  }
};

const userAvatar = (avatar: string | null) => {
  if (avatar === null || avatar === "") {
    return Icon.Person;
  }
  return `https://img2.storyblok.com/72x72/${avatar}`;
};

export default function collaborators(props: { spaceId: number }) {
  const data = sbData<collaboratorsData>(`spaces/${props.spaceId}`);
  const rolesData = sbData<rolesData>(`spaces/${props.spaceId}/space_roles`);

  if ((data.isLoading && rolesData.isLoading) || (rolesData.isLoading === false && rolesData.data === undefined)) {
    return <Detail isLoading={data.isLoading} markdown={`Loading...`} />;
  }
  if (data.data === undefined || data.data.space.collaborators.length === 0) {
    return (
      <List>
        <List.EmptyView title={"No Collaborators found."} icon={Icon.Person} />
      </List>
    );
  }

  const spaceName = data.data.space.name;
  let roles = [] as spaceRole[];
  if (rolesData.data && rolesData.data.space_roles.length > 0) {
    roles = rolesData.data.space_roles ?? [];
  }
  return (
    <List isLoading={data.isLoading}>
      {data.data.space.collaborators.map((collaborator) =>
        collaborator.user !== null && collaborator.user.firstname ? (
          <List.Item
            key={collaborator.id}
            title={`${capitalize(collaborator.user.friendly_name)}`}
            icon={userAvatar(collaborator.user.avatar)}
            accessories={[
              {
                tag: {
                  value: `${matchRole(capitalize(collaborator.role), roles)}`,
                  color: assignRoleColor(collaborator.role),
                },
              },
              { text: { value: `ID: ${collaborator.user_id}` } },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title={`Email ${capitalize(collaborator.user.firstname)}`}
                  url={`mailto:${collaborator.user.userid}?subject=${spaceName}`}
                />
                <Action.CopyToClipboard title="Copy Email" content={collaborator.user.userid} />
                <Action.CopyToClipboard title="Copy User ID" content={collaborator.user_id} />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            key={collaborator.id}
            title={`Invited: ${collaborator.invitation?.email ?? " No longer exists"}`}
          />
        ),
      )}
    </List>
  );
}
