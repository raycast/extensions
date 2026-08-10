import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { ServerHookType, ServerType } from "../../type/server";
import { GetApiKey, GetDefaultServer } from "../../type/config";

export const ServerForm = (props: { server?: ServerType; use: { servers: ServerHookType }; name?: string }) => {
  const { use, server } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ServerType>({
    onSubmit: async (server: ServerType) => {
      const updatedItem: ServerType = { ...server };

      const items = use.servers.data.filter((x: ServerType) => x.server_id === updatedItem.server_id);
      const item = items[0];
      item.apiKey = updatedItem.apiKey;

      if (props.server) {
        use.servers.update({ ...item });
      }
      pop();
    },
    validation: {
      apiKey: FormValidation.Required,
    },
    initialValues: {
      server_id: server?.server_id,
      apiKey: server?.apiKey ?? (GetDefaultServer() === server?.server_id ? GetApiKey() : ""),
    },
  });

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Submit" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextField title="Id" placeholder="Id" {...itemProps.server_id} />
        <Form.TextField title="Api key" placeholder="Api key" {...itemProps.apiKey} />
      </Form>
    </>
  );
};
