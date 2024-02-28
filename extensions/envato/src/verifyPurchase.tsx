import { ActionPanel, Action, Form, showToast, Toast, useNavigation, LaunchProps } from "@raycast/api";
import { verifyPurchaseCode } from "./utils";
import PurchaseDetails from "./purchaseDetails";
type Values = {
  pc: string;
};
export default function Command(props: LaunchProps<{ arguments: { purchaseCode: string } }>) {
  const { push } = useNavigation();

  if (props.arguments.purchaseCode) {
    submit(props.arguments.purchaseCode);
  }

  async function submit(purchaseCode: string) {
    if (purchaseCode.length === 0) {
      await showToast({ title: "Purchase code cannot be empty.", style: Toast.Style.Failure });
      return;
    }
    const loadingToast = await showToast({ title: "Verifiying...", style: Toast.Style.Animated });
    try {
      const result = await verifyPurchaseCode(purchaseCode);
      loadingToast.hide();
      if (!result) {
        await showToast({ title: "Invalid Purchase Code", style: Toast.Style.Failure });
        return;
      }
      push(<PurchaseDetails data={result} />);
    } catch (error) {
      loadingToast.hide();
      await showToast({ title: "Error", style: Toast.Style.Failure });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={(values: Values) => submit(values.pc)} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Purchase Code" id="pc" defaultValue={props.arguments.purchaseCode} />
    </Form>
  );
}
