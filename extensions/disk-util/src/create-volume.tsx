import {
  Action,
  ActionPanel,
  closeMainWindow,
  environment,
  Form,
  Icon,
  LaunchProps,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, useExec, useForm } from "@raycast/utils";
import { spawn } from "node:child_process";
import { sep } from "path";

type FormValues = {
  name: string;
  quota: string;
  caseSensitive: boolean;
  encrypted: boolean;
  symlink: boolean;
};

export default function CreateVolume(props: LaunchProps<{ draftValues: FormValues }>) {
  const { draftValues } = props;
  const { assetsPath, supportPath } = environment;
  const bundleId = supportPath.split(sep).find((comp) => comp.startsWith("com.raycast")) ?? "com.raycast.macos";
  const { isLoading } = useExec("chmod", [
    "+x",
    `${assetsPath}/scripts/create-volume`,
    `${assetsPath}/scripts/askpass`,
  ]);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: async ({ name, encrypted, caseSensitive, quota, symlink }) => {
      const toast = await showToast(Toast.Style.Animated, `Creating Volume '${name}'`, "Please wait...");
      const fs = caseSensitive ? "Case-sensitive APFS" : "APFS";

      const askpassPath = `${assetsPath}/scripts/askpass`;
      const env = Object.assign({}, process.env, { SUDO_ASKPASS: askpassPath, RAYCAST_BUNDLE: bundleId });

      const child = spawn(
        "sudo -A",
        [`${assetsPath}/scripts/create-volume`, name, `"${fs}"`, encrypted + "", symlink + "", quota ? quota : "none"],
        { shell: true, env },
      );
      child.stdout.on("data", async (msg) => {
        toast.message = msg;
        if (msg.includes("success")) {
          await closeMainWindow();
          toast.style = Toast.Style.Success;
          toast.title = `Successfully created volume '${name}'.`;
          await toast.show();
          await popToRoot();
        }
      });

      child.stderr.on("data", async (msg) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create volume";
        toast.message = msg;
      });
    },
    initialValues: draftValues ?? { caseSensitive: true, encrypted: true },
    validation: {
      name: FormValidation.Required,
      quota: (value) => {
        if (value) {
          if (!Number.isInteger(Number(value))) {
            return "Quota size must be an integer";
          }

          if (Number(value) < 1) {
            return "Quota size must be greater than 0";
          }
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Volume" onSubmit={handleSubmit} icon={Icon.HardDrive} />
        </ActionPanel>
      }
      isLoading={isLoading}
      enableDrafts
    >
      <Form.TextField title="Volume Name" placeholder="vol1" {...itemProps.name} />
      <Form.Checkbox label="Case Sensitive" {...itemProps.caseSensitive} />
      <Form.Checkbox label="Encrypted" {...itemProps.encrypted} />
      <Form.Checkbox label="Create Symlink from $HOME" {...itemProps.symlink} />
      <Form.Separator />
      <Form.Description title="Size Options" text="APFS volumes share storage space within their container." />
      <Form.TextField
        title="Quota Size (in GB)"
        placeholder="(optional)"
        info="The optional reserve size ensures that amount of storage will remain available for this volume."
        {...itemProps.quota}
      />
    </Form>
  );
}
