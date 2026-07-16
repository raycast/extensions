// src/search.tsx
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { SecretForm } from "./components/secret-form";
import { store, Secret } from "./storage";

export default function SearchCommand() {
  // usePromise runs store.list() on mount, tracks isLoading/error, and shows a
  // failure toast automatically. revalidate() re-runs it after a mutation.
  // (Prefer this over a hand-rolled useEffect + useState fetch.)
  const {
    isLoading,
    data: secrets = [],
    revalidate,
  } = usePromise(() => store.list());

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search by title">
      {secrets.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No secrets yet"
          description="Use Save Secret to add one."
        />
      ) : (
        secrets.map((secret) => (
          <List.Item
            key={secret.id}
            title={secret.title}
            accessories={[{ date: new Date(secret.updatedAt) }]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Content"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await Clipboard.copy(secret.content);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Copied to clipboard",
                      message: secret.title,
                    });
                  }}
                />
                <Action.Push
                  title="Show Details"
                  icon={Icon.Eye}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  target={<SecretDetail secret={secret} />}
                />
                <Action.Push
                  title="Edit"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<EditSecret secret={secret} onSaved={revalidate} />}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    const ok = await confirmAlert({
                      title: "Delete this secret?",
                      message: secret.title,
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                      },
                    });
                    if (!ok) return;
                    try {
                      await store.remove(secret.id);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Deleted",
                        message: secret.title,
                      });
                      revalidate();
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to delete",
                        message:
                          error instanceof Error
                            ? error.message
                            : String(error),
                      });
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function SecretDetail({ secret }: { secret: Secret }) {
  const md = `# ${secret.title}\n\n\`\`\`\n${secret.content}\n\`\`\``;
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action
            title="Copy Content"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(secret.content);
              await showToast({
                style: Toast.Style.Success,
                title: "Copied",
                message: secret.title,
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function EditSecret({
  secret,
  onSaved,
}: {
  secret: Secret;
  onSaved: () => void;
}) {
  return (
    <SecretForm
      submitTitle="Update Secret"
      initialValues={{ title: secret.title, content: secret.content }}
      onSubmit={async (values) => {
        await store.update(secret.id, values);
        await showToast({
          style: Toast.Style.Success,
          title: "Updated",
          message: values.title,
        });
        onSaved();
        // SecretForm calls pop() after onSubmit resolves, so we don't navigate here.
      }}
    />
  );
}
