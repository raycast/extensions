import { Action, ActionPanel, Form, PopToRootType, captureException, showHUD, showToast } from "@raycast/api";

import * as api from "./api";
import { formatAPIError } from "./error-handler";
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
              try {
                await api.alias.edit(alias?.id ?? "", { description: values.description });
                await showHUD("Alias edited", { popToRootType: PopToRootType.Immediate });
              } catch (error) {
                captureException(error);

                await showToast(formatAPIError(error, "Error Editing Alias"));
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
