import { ActionPanel, Action, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { DeveloperOrg } from "../models/models";
import { deleteOrg } from "../utils/sf";

export function ConfirmDeletion(props: { org: DeveloperOrg; callback: () => Promise<void> }) {
  const { pop } = useNavigation();

  const deleteSelectedOrg = async (org: DeveloperOrg) => {
    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Deleting ${org.alias}`,
      });
      await deleteOrg(org.username);
      props.callback();
      toast.hide();
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async () => {
              console.log("Handle delete");
              await deleteSelectedOrg(props.org);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Are you sure you want to log out?"
        text="Logging out will remove this org from Multi-Force as well as all other places you use SF to control your orgs. Press Enter to confirm or ESC to exit."
      />
    </Form>
  );
}
