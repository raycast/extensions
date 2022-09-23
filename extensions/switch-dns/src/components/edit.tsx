import { Action, ActionPanel, Form, useNavigation, showToast, Toast } from "@raycast/api";
import { isIP } from "is-ip";
import { FormValue } from "../types/types";
import StorageUtils from "../utils/storage-utils";

const Edit = (props: { afterPop?: () => void }) => {
  const { pop } = useNavigation();

  const onSubmit = async (values: FormValue) => {
    const { title, dns, description } = values;
    const accessory = description || "User-Defined-DNS";

    if (!title || !dns) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please fill in all fields",
      });
      return;
    }

    const dnsArr = dns.split("\n").filter((val) => !!val.trim());

    if (dnsArr.every((val) => isIP(val))) {
      await StorageUtils.addDNS({ title, accessory, dns: dnsArr.join(",") });
      pop();
      props.afterPop?.();
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid DNS",
      });
      return;
    }
  };

  return (
    <Form
      actions={
        <ActionPanel title="Add Custom DNS">
          <Action.SubmitForm title="Add" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" id="title" placeholder="Name of Custom DNS" />
      <Form.TextArea title="DNS" id="dns" placeholder={`223.5.5.5\n223.6.6.6\n1.1.1.1`} />
      <Form.TextArea title="Description" id="description" placeholder="Description (optional)" />
    </Form>
  );
};

export default Edit;
