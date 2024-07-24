import { Action, ActionPanel, Color, Form, Icon, LaunchProps, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { spawn } from "node:child_process";
import { useScriptsAccessible } from "@hooks/use-scripts-accessible";
import { VolumeDetails } from "@components/volume-details";
import { Volumes } from "@components/volumes";
import { assetsPath, env } from "@utils/env";

type FormValues = {
  name: string;
  quota: string;
  format: string;
  symlink: boolean;
  disableIndexing: boolean;
};

export default function CreateVolume(props: LaunchProps<{ draftValues: FormValues }>) {
  const { draftValues } = props;
  const { push } = useNavigation();
  const [lastFormat, setLastFormat] = useCachedState<string>("last-format", "apfs:case-sensitive:encrypted", {
    cacheNamespace: "create-volume",
  });
  const { isScriptsLoading } = useScriptsAccessible();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: async ({ name, format, quota, symlink, disableIndexing }) => {
      const toast = await showToast(Toast.Style.Animated, `Creating Volume '${name}'`, "Please wait...");
      setLastFormat(format);
      const fs = format.split(":")[1] === "case-sensitive" ? "Case-sensitive APFS" : "APFS";
      const encrypted = (format.split(":")[2] === "encrypted") + "";

      const child =
        encrypted === "true"
          ? spawn(
              "sudo -A",
              [
                `${assetsPath}/scripts/create-volume`,
                name,
                `"${fs}"`,
                encrypted,
                symlink + "",
                disableIndexing + "",
                quota ? quota : "none",
              ],
              { shell: true, env },
            )
          : spawn(
              `${assetsPath}/scripts/create-volume`,
              [name, `"${fs}"`, encrypted, symlink + "", disableIndexing + "", quota ? quota : "none"],
              { shell: true },
            );

      child.stdout.on("data", async (msg) => {
        toast.message = msg;
        if (msg.includes("success")) {
          toast.style = Toast.Style.Success;
          toast.title = `Successfully created volume '${name}'.`;

          toast.primaryAction = {
            title: "Show Volume Details",
            shortcut: { modifiers: ["cmd"], key: "d" },
            onAction: async () => {
              push(<VolumeDetails name={name} />);
              await toast.hide();
            },
          };

          toast.secondaryAction = {
            title: "Show All Volumes",
            shortcut: { modifiers: ["cmd"], key: "a" },
            onAction: async () => {
              push(<Volumes />);
              await toast.hide();
            },
          };
        }
      });

      child.stderr.on("data", async (msg) => {
        if (!msg.includes("disabling Spotlight")) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to create volume";
          toast.message = msg;
        }
      });
    },
    initialValues: draftValues ?? { format: lastFormat },
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
      isLoading={isScriptsLoading}
      enableDrafts
    >
      <Form.TextField title="Volume Name" placeholder="vol1" {...itemProps.name} />
      <Form.Dropdown title="Format" {...itemProps.format}>
        <Form.Dropdown.Item
          title="APFS"
          value="apfs:case-insensitive:non-encrypted"
          icon={{ source: Icon.LockDisabled, tintColor: Color.Orange }}
        />
        <Form.Dropdown.Item
          title="APFS (Encrypted)"
          value="apfs:case-insensitive:encrypted"
          icon={{ source: Icon.Lock, tintColor: Color.Blue }}
        />
        <Form.Dropdown.Item
          title="APFS (Case-sensitive)"
          value="apfs:case-sensitive:non-encrypted"
          icon={{ source: Icon.LockDisabled, tintColor: Color.Orange }}
        />
        <Form.Dropdown.Item
          title="APFS (Case-sensitive, Encrypted)"
          value="apfs:case-sensitive:encrypted"
          icon={{ source: Icon.Lock, tintColor: Color.Blue }}
        />
      </Form.Dropdown>
      <Form.TextField
        title="Quota Size (in GB)"
        placeholder="(optional)"
        info="The optional reserve size ensures that amount of storage will remain available for this volume."
        {...itemProps.quota}
      />
      <Form.Checkbox label="Create Symlink from $HOME" {...itemProps.symlink} />
      <Form.Checkbox label="Disable Spotlight indexing to save CPU overhead" {...itemProps.disableIndexing} />
    </Form>
  );
}
