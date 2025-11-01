import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { User } from "./lib/models";

export default function UserDetails({ user }: { user: User }) {
  const phone = getUserPhone(user);
  const birthday = getUserBirthday(user);

  return (
    <List navigationTitle={user.name}>
      <List.Item
        key="name"
        id="name"
        title="Name"
        subtitle={user.name}
        icon={Icon.Person}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={user.name} />
          </ActionPanel>
        }
        accessories={[
          {
            icon: {
              source: user.photo_thumb,
              mask: Image.Mask.Circle,
            },
          },
        ]}
      />
      <List.Item
        key="role"
        id="role"
        title="Role"
        subtitle={user.title && user.title.length > 0 ? user.title : "N/A"}
        icon={Icon.Hammer}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={user.name} />
          </ActionPanel>
        }
      />
      <List.Item
        key="email"
        id="email"
        title="E-mail"
        subtitle={user.email && user.email.length > 0 ? user.email : "N/A"}
        icon={Icon.Envelope}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={user.email} />
            <Action.Open
              title="Send an Email"
              target={`mailto:${user.email}`}
            />
          </ActionPanel>
        }
      />
      <List.Item
        key="phone"
        id="phone"
        title="Phone"
        subtitle={phone}
        icon={Icon.Phone}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={phone} />
            {/* eslint-disable-next-line @raycast/prefer-title-case */}
            <Action.Open title="Call on FaceTime" target={`tel:${phone}`} />
          </ActionPanel>
        }
      />
      <List.Item
        key="location"
        id="location"
        title="Location"
        subtitle={
          user.location && user.location.length > 0 ? user.location : "N/A"
        }
        icon={Icon.Globe}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={user.location} />
          </ActionPanel>
        }
      />
      <List.Item
        key="birthday"
        id="birthday"
        title="Birthday"
        subtitle={birthday}
        icon={Icon.Calendar}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={birthday} />
          </ActionPanel>
        }
      />
    </List>
  );

  function getUserPhone(user: User): string {
    if (user.phone && user.phone.length > 0) {
      return user.phone;
    }

    if (user.mobile_phone && user.mobile_phone.length > 0) {
      return user.mobile_phone;
    }

    return "N/A";
  }

  function getUserBirthday(user: User): string {
    if (user.birthday && user.birthday.length > 0) {
      const date = new Date(user.birthday);
      const formatter = new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      return formatter.format(date);
    }

    return "N/A";
  }
}
