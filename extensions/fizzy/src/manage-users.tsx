import { useCachedPromise, useForm } from "@raycast/utils";
import { ACCOUNT_SLUG, fizzy } from "./fizzy";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { User } from "./types";
import fs from "fs";
import path from "path";

export default function ManageUsers() {
  const { isLoading: isLoadingMe, data: me } = useCachedPromise(fizzy.getMyIdentity);
  const { isLoading, data: users, mutate } = useCachedPromise(fizzy.users.list, [], { initialData: [] });

  return (
    <List isLoading={isLoading || isLoadingMe}>
      {users.map((user) => (
        <List.Item
          key={user.id}
          icon={user.role === "owner" ? Icon.PersonCircle : Icon.Person}
          title={user.name}
          subtitle={user.email_address}
          accessories={[{ tag: user.role }, { date: new Date(user.created_at) }]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Pencil} title="Update User" target={<UpdateUser user={user} />} onPop={mutate} />
              <Action.OpenInBrowser url={user.url} />
              {!isLoading &&
              me?.accounts.length &&
              me.accounts.find((account) => account.id === ACCOUNT_SLUG)?.user.id !== user.id ? (
                <Action
                  icon={Icon.RemovePerson}
                  title="Deactivate User"
                  onAction={() =>
                    confirmAlert({
                      icon: { source: Icon.RemovePerson, tintColor: Color.Red },
                      title: "Deactivate User",
                      message: "Are you sure you want to deactivate this user?",
                      primaryAction: {
                        style: Alert.ActionStyle.Destructive,
                        title: "Deactivate",
                        async onAction() {
                          const toast = await showToast(Toast.Style.Animated, "Deactivating", user.name);
                          try {
                            await mutate(fizzy.users.deactivate(user.id), {
                              optimisticUpdate(data) {
                                return data.filter((u) => u.id !== user.id);
                              },
                              shouldRevalidateAfter: false,
                            });
                            toast.style = Toast.Style.Success;
                            toast.title = "Deactivated";
                          } catch (error) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "Failed";
                            toast.message = `${error}`;
                          }
                        },
                      },
                    })
                  }
                  style={Action.Style.Destructive}
                />
              ) : undefined}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function UpdateUser({ user }: { user: User }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, setValidationError } = useForm<{ name: string; files: string[] }>({
    async onSubmit(values) {
      const { name, files } = values;
      let avatar: string | undefined;
      if (files.length) {
        const file = files[0];
        if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
          setValidationError("files", "Please select a valid file");
          return;
        }
        const allowedExtensions = [".jpeg", ".jpg", ".png", ".gif", ".webp"];
        const ext = path.extname(file).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          setValidationError("files", "Only JPEG, PNG, GIF, or WebP are allowed");
          return;
        }
        avatar = file;
      }
      const data = new FormData();
      if (name) data.append("user[name]", name);
      if (avatar) data.append("user[avatar]", new File([fs.readFileSync(avatar)], avatar));
      const toast = await showToast(Toast.Style.Animated, "Updating", user.name);
      try {
        await fizzy.users.update(user.id, data);
        toast.style = Toast.Style.Success;
        toast.title = "Updated";
        toast.message = name || user.name;
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      name: user.name,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Pencil} title="Update User" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder={user.name} {...itemProps.name} />
      <Form.FilePicker
        title="Avatar"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        {...itemProps.files}
      />
    </Form>
  );
}
