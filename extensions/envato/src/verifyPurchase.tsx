import { ActionPanel, Action, Form, showToast, Toast, useNavigation, LaunchProps } from "@raycast/api";
import { verifyPurchaseCode } from "./utils";
import PurchaseDetails from "./purchaseDetails";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect } from "react";
type Values = {
  pc: string;
};
export default function Command(props: LaunchProps<{ arguments: Arguments.VerifyPurchase }>) {
  const { push } = useNavigation();

  const { itemProps, handleSubmit } = useForm<Values>({
    onSubmit(values) {
      submit(values.pc);
    },
    initialValues: {
      pc: props.arguments.purchaseCode,
    },
    validation: {
      pc: FormValidation.Required,
    },
  });

  useEffect(() => {
    if (props.arguments.purchaseCode) {
      submit(props.arguments.purchaseCode);
    }
  }, []);

  async function submit(purchaseCode: string) {
    const toast = await showToast({ title: "Verifiying...", style: Toast.Style.Animated });
    try {
      const result = await verifyPurchaseCode(purchaseCode);
      if (!result) throw new Error("Invalid Purchase Code");
      push(<PurchaseDetails data={result} />);
    } catch (error) {
      toast.title = "Error";
      toast.message = `${error}`;
      toast.style = Toast.Style.Failure;
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Purchase Code"
        placeholder="86781236-23d0-4b3c-7dfa-c1c147e0dece
"
        {...itemProps.pc}
      />
    </Form>
  );
}
