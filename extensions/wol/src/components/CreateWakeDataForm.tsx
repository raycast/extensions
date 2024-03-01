import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { WakeData } from "../types";
import { exec } from "child_process";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect } from "react";

export default function CreateWakeDataForm(props: { onCreate: (values: WakeData) => void }) {
  const { onCreate } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, values, setValue } = useForm<WakeData>({
    onSubmit(values) {
      onCreate({ ...values, mac: values.mac.trim(), ip: values.ip.trim() });
      showToast({
        style: Toast.Style.Success,
        title: "Yay!",
        message: `${values.name} created successfully!`,
      }).then(() => pop());
    },
    initialValues: { name: "", mac: "", ip: "", port: "9" },
    validation: {
      name: FormValidation.Required,
      ip: FormValidation.Required,
      mac: (value) => {
        if (value && !/([a-fA-F0-9]{2}[:-]){5}([a-fA-F0-9]{2})/.test(value.trim())) {
          return "Invalid MAC address";
        } else if (!value) {
          return "The item is required";
        }
      },
    },
  });

  useEffect(() => {
    // If the MAC address is not 17 characters long, or the IP address is not empty, return.
    if (values.mac.length !== 17 || values.ip.length > 0) {
      return;
    }
    let index = 0;
    const intervalId = setInterval(() => {
      setValue("ip", "Loading" + ".".repeat(index++ % 3));
    }, 300);

    exec(`/usr/sbin/arp -a | grep ${values.mac}`, function (err, stdout) {
      clearInterval(intervalId);
      if (err) {
        setValue("ip", "");
        // console.log(err, stderr);
        return;
      }
      const newIp = stdout.split(" ")[1].replace("(", "").replace(")", "").trim();
      setValue("ip", newIp);
    });
    return () => clearInterval(intervalId);
  }, [values.mac]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Machine Name" {...itemProps.name} />
      <Form.TextField title="MAC Address" {...itemProps.mac} />
      <Form.TextField title="IP Address" {...itemProps.ip} />
      <Form.TextField title="Port" {...itemProps.port} />
    </Form>
  );
}
