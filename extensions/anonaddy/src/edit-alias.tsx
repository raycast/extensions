import { Action, ActionPanel, Form, Toast, popToRoot, showHUD, showToast } from "@raycast/api";

import * as api from "./api";
import useAlias from "./useAlias";

type Props = {
  id: string;
};

const EditAlias = ({ id }: Props) => {
  const { data: alias, isLoading } = useAlias(id);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Edit Alias"
            onSubmit={async (values) => {
              const success = await api.alias.edit(alias?.id ?? "", { description: values.description });

              if (success) {
                await showHUD("✅ Alias edited");
                await popToRoot();
              } else {
                await showToast({
                  message: "Please check your credentials in the extension preferences.",
                  style: Toast.Style.Failure,
                  title: "Error editing alias",
                });
              }
            }}
          />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.Description text={alias?.email ?? ""} />
      <Form.TextField id="description" placeholder="Newsletter" title="Description" value={alias?.description ?? ""} />
    </Form>
  );
};

export default EditAlias;
