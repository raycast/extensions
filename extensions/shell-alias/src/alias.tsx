import { ActionPanel, Action, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import useApi from "./hooks/use-api";
import CreateAlias from "./create-alias";
import FormAlias, { CreateAliasFormValues } from "./components/form-alias";
import { AliasConflictError } from "./api/shell/errors/alias-conflict";

export default function Command() {
  const { pop } = useNavigation();
  const { api, renderIfShellSupported } = useApi();

  const { isLoading, data, revalidate } = usePromise(async () => {
    await api.shell().configure();
    return api.shell().getAliases();
  });

  const editAlias = async (name: string, values: CreateAliasFormValues) => {
    try {
      await api.shell().updateAlias(name, values);
      revalidate();
      pop();
    } catch (error) {
      if (error instanceof AliasConflictError) {
        showToast({
          style: Toast.Style.Failure,
          title: "Oops!",
          message: "An alias with this name already exists",
        });
        return;
      }

      showFailureToast(error, { title: "Oops!", message: "Something went wrong" });
    }
  };

  const deleteAlias = async (name: string) => {
    try {
      await api.shell().deleteAlias(name);
      return revalidate();
    } catch (error) {
      console.error(error);
      return showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: "Unable to delete the alias",
      });
    }
  };

  return renderIfShellSupported(
    <List isLoading={isLoading}>
      {data && data.length === 0 ? (
        <List.EmptyView
          title="No aliases found"
          actions={
            <ActionPanel>
              <Action.Push title="Create Alias" target={<CreateAlias />} />
            </ActionPanel>
          }
        />
      ) : (
        data?.map((item) => (
          <List.Item
            key={item.name}
            title={item.command}
            accessories={[
              {
                tag: item.name,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Paste content={`${item.name} `} />
                <Action.CopyToClipboard content={item.command} />
                <Action.Push
                  title="Edit"
                  icon={Icon.Pencil}
                  target={<FormAlias initialValues={item} onSubmit={(values) => editAlias(item.name, values)} />}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteAlias(item.name)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>,
  );
}
