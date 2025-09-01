import { useCachedPromise, useForm } from "@raycast/utils";
import { authenticate, pocketbase } from "./pocketbase";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { filesize } from "filesize";

export default function SearchBackups() {
  const {
    isLoading,
    data: backups,
    error,
    revalidate,
    mutate,
  } = useCachedPromise(
    async () => {
      await authenticate();
      const backups = await pocketbase.backups.getFullList();
      return backups;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search backups">
      {!isLoading && !backups.length && !error ? (
        <List.EmptyView
          title="No backups yet."
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Play}
                title="Initialize New Backup"
                target={<InitializeBackup onCreate={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`${backups.length} backups`}>
          {backups.map((backup) => (
            <List.Item
              key={backup.key}
              icon={Icon.Folder}
              title={backup.key}
              subtitle={filesize(backup.size, { standard: "jedec" })}
              accessories={[{ date: new Date(backup.modified) }]}
              actions={
                isLoading ? undefined : (
                  <ActionPanel>
                    <Action
                      icon={Icon.Download}
                      title="Open Download URL"
                      onAction={async () => {
                        const toast = await showToast(Toast.Style.Animated, "Generating Token", backup.key);
                        try {
                          const token = await pocketbase.files.getToken();
                          toast.style = Toast.Style.Success;
                          toast.title = "Opening URL";
                          const url = pocketbase.backups.getDownloadUrl(token, backup.key);
                          open(url);
                        } catch (error) {
                          toast.style = Toast.Style.Failure;
                          toast.title = "Failed";
                          toast.message = `${error}`;
                        }
                      }}
                    />
                    <Action.Push
                      icon={Icon.Play}
                      title="Initialize New Backup"
                      target={<InitializeBackup onCreate={revalidate} />}
                    />
                    <Action
                      icon={Icon.Trash}
                      title="Delete"
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() =>
                        confirmAlert({
                          title: `Do you really want to delete ${backup.key}?`,
                          primaryAction: {
                            style: Alert.ActionStyle.Destructive,
                            title: "Yes",
                            async onAction() {
                              const toast = await showToast(Toast.Style.Animated, "Deleting", backup.key);
                              try {
                                await mutate(pocketbase.backups.delete(backup.key), {
                                  optimisticUpdate(data) {
                                    return data.filter((b) => b.key !== backup.key);
                                  },
                                  shouldRevalidateAfter: false,
                                });
                                toast.style = Toast.Style.Success;
                                toast.title = "Deleted";
                              } catch (error) {
                                toast.style = Toast.Style.Failure;
                                toast.title = "Failed";
                                toast.message = `${error}`;
                              }
                            },
                          },
                          dismissAction: {
                            title: "No",
                          },
                        })
                      }
                    />
                  </ActionPanel>
                )
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function InitializeBackup({ onCreate }: { onCreate: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        await pocketbase.backups.create(values.name.replaceAll(" ", "_") + ".zip");
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        onCreate();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Play} title="Start Backup" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`
Please note that during the backup other concurrent write requests may fail since the database will be temporary "locked" (this usually happens only during the ZIP generation).

If you are using S3 storage for the collections file upload, you'll have to backup them separately since they are not locally stored and will not be included in the final backup!`}
      />
      <Form.TextField
        title="Backup name"
        placeholder="Leave empty to autogenerate"
        info="Must be in the format [a-z0-9_-].zip"
        {...itemProps.name}
      />
    </Form>
  );
}
