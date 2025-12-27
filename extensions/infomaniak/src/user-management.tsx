import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, getAvatarIcon, useCachedPromise, useForm } from "@raycast/utils";
import { infomaniak } from "./infomaniak";
import { Account, type InviteUser } from "./types";

export default function Accounts() {
  const { isLoading, data: accounts } = useCachedPromise(
    async () => {
      const { data } = await infomaniak.accounts.list();
      return data;
    },
    [],
    {
      initialData: [],
    },
  );
  return (
    <List isLoading={isLoading}>
      <List.Section subtitle={`${accounts.length}`}>
        {accounts.map((account) => (
          <List.Item
            key={account.id}
            icon={getAvatarIcon(`${account.name[0]} ${account.name[1]}`)}
            title={account.name}
            subtitle={account.type === "owner" ? "Legally responsible of the private area" : account.type}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Person} title="Users" target={<Users account={account} />} />
                <Action.Push icon={Icon.TwoPeople} title="Teams" target={<Teams account={account} />} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function Users({ account }: { account: Account }) {
  const {
    isLoading,
    data: users,
    mutate,
  } = useCachedPromise(
    (accountId: number) => async (options) => {
      const { data, pages } = await infomaniak.accounts.users.list({ accountId, page: options.page + 1 });
      return {
        data,
        hasMore: options.page < pages,
      };
    },
    [account.id],
    {
      initialData: [],
    },
  );
  return (
    <List isLoading={isLoading}>
      <List.Section subtitle={`${users.length}`}>
        {users.map((user) => (
          <List.Item
            key={user.user_id}
            icon={getAvatarIcon(`${user.first_name[0]} ${user.first_name[1]}`)}
            title={user.display_name}
            subtitle={user.email}
            accessories={[{ text: user.role_type === "owner" ? "Legal representative" : user.role_type }]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.AddPerson}
                  title="Invite User"
                  target={<InviteUser account={account} />}
                  onPop={mutate}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
function InviteUser({ account }: { account: Account }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<InviteUser>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Inviting", values.email);
      try {
        const { data } = await infomaniak.accounts.users.invite({ accountId: account.id, body: values });
        toast.style = Toast.Style.Success;
        toast.title = "Invited";
        toast.message = data.status;
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      first_name: FormValidation.Required,
      last_name: FormValidation.Required,
      role_type: FormValidation.Required,
      email: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.AddPerson} title="Invite User" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="First Name" placeholder="Lonie" {...itemProps.first_name} />
      <Form.TextField title="Last Name" placeholder="Hauck" {...itemProps.last_name} />
      <Form.Dropdown title="Role" {...itemProps.role_type}>
        <Form.Dropdown.Item title="Legal representative" value="owner" />
        <Form.Dropdown.Item title="Administrator" value="admin" />
        <Form.Dropdown.Item title="User" value="user" />
      </Form.Dropdown>
      <Form.TextField title="Email Address" placeholder="kshlerin.marcelle@gleason.com" {...itemProps.email} />
    </Form>
  );
}

function Teams({ account }: { account: Account }) {
  const { isLoading, data: teams } = useCachedPromise(
    (accountId: number) => async (options) => {
      const { data, pages } = await infomaniak.accounts.teams.list({ accountId, page: options.page + 1 });
      return {
        data,
        hasMore: options.page < pages,
      };
    },
    [account.id],
    {
      initialData: [],
    },
  );
  return (
    <List isLoading={isLoading}>
      {!isLoading && !teams.length ? (
        <List.EmptyView
          icon="empty-table.svg"
          title="No work team"
          description={`Organise the users of ${account.name} into work teams`}
        />
      ) : (
        <List.Section subtitle={`${teams.length}`}>
          {teams.map((team) => (
            <List.Item key={team.id} icon={Icon.TwoPeople} title={team.name} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
