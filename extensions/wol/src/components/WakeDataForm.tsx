import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { WakeData } from "../types";
import { exec } from "child_process";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect } from "react";

export default function WakeDataForm(props: { upsert: (values: WakeData) => void; initial?: WakeData }) {
  const { upsert, initial } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, values, setValue } = useForm<WakeData>({
    onSubmit(values) {
      upsert({ ...values, mac: values.mac.trim(), ip: values.ip.trim() });
      showToast({
        style: Toast.Style.Success,
        title: "Yay!",
        message: `${values.name} created successfully!`,
      }).then(() => pop());
    },
    initialValues: initial || { name: "", mac: "", ip: "", port: "9" },
    validation: {
      name: FormValidation.Required,
      ip: FormValidation.Required,
      mac: (value) => {
        if (value === undefined || value.trim().length === 0) {
          return "The item is required";
        }
        // align with the wol.ts validate logic
        if (value.trim().length !== 17) {
          return "Invalid MAC address";
        }
        const mac = value.trim().replace(new RegExp(value[2], "g"), "");
        if (mac.length !== 12 || mac.match(/[^a-fA-F0-9]/)) {
          return "Invalid MAC address";
        }
      },
    },
  });

  useEffect(() => {
    // If the MAC address is not 17 characters long, or the IP address is not empty, return.
    if (values.mac.length !== 17 || values.ip.length > 0) {
      return;
    }
    exec(`/usr/sbin/arp -a | grep ${values.mac}`, function (err, stdout) {
      if (err) {
        return;
      }
      const newIp = stdout.split(" ")[1].replace("(", "").replace(")", "").trim();
      setValue("ip", newIp);
    });
  }, [values.mac]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={initial ? "Update" : "Create"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Machine Name" {...itemProps.name} />
      <Form.TextField title="MAC Address" {...itemProps.mac} />
      <Form.TextField title="IP Address" {...itemProps.ip} />
      <Form.TextField title="WOL Port" {...itemProps.port} />
    </Form>
  );
}
