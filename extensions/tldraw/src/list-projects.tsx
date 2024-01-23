import { ActionPanel, List, Action, LocalStorage, Form, showHUD, PopToRootType, Icon } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { ProjectValues } from "./shared";

export default function Command() {
  const { isLoading, data, revalidate } = usePromise(
    () =>
      LocalStorage.allItems().then((items) =>
        Object.entries(items).map(([name, props]) => [name, JSON.parse(props)]),
      ) as Promise<[string, ProjectValues][]>,
    [],
  );
  return (
    <List isLoading={isLoading}>
      {data &&
        data.map(([name, { url, description }]) => (
          <List.Item
            key={name}
            title={name}
            subtitle={description}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={url} />
                <Action.CopyToClipboard title="Copy Project URL" content={url} />
                <Action.Push
                  title="Edit Project Details"
                  icon={Icon.Pencil}
                  target={
                    <Form
                      actions={
                        <ActionPanel key="save-action">
                          <Action.SubmitForm
                            title="Save"
                            onSubmit={async ({ name: newName, ...others }) => {
                              if (newName !== name) {
                                await LocalStorage.removeItem(name);
                              }
                              return Promise.all([
                                LocalStorage.setItem(newName, JSON.stringify({ url, ...others })),
                                revalidate(),
                                showHUD(`Project "${newName}" Updated`, {
                                  clearRootSearch: true,
                                  popToRootType: PopToRootType.Immediate,
                                }),
                              ]).then(() => true);
                            }}
                          />
                        </ActionPanel>
                      }
                    >
                      <Form.TextField id="name" title="Name" placeholder="Name..." defaultValue={name} />
                      <Form.TextArea
                        id="description"
                        title="Description"
                        placeholder="Description..."
                        defaultValue={description}
                      />
                    </Form>
                  }
                />
                <Action
                  title="Delete Project"
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  onAction={async () => {
                    await Promise.all([
                      LocalStorage.removeItem(name),
                      revalidate(),
                      showHUD(`Project "${name}" Deleted`, { clearRootSearch: true }),
                    ]).catch((error) => showFailureToast(error, { title: "Failed to delete project" }));
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
