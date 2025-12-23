import { Action, ActionPanel, Form, Toast, showToast, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatMiseError, installPlugin, listRegistryEntries } from "./tools/mise";

interface AddPluginFormValues {
  name: string;
  url?: string;
}

export default function AddPluginCommand() {
  const { data: registryEntries, isLoading } = usePromise(listRegistryEntries, []);
  const suggestions =
    registryEntries && registryEntries.length > 0
      ? registryEntries
          .slice(0, 6)
          .map((entry) => entry.name)
          .join(", ")
      : undefined;

  async function handleSubmit(values: AddPluginFormValues) {
    const name = values.name.trim();
    const gitUrl = values.url?.trim();

    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "Plugin name is required" });
      return;
    }

    if (gitUrl && !gitUrl.startsWith("http") && !gitUrl.startsWith("git@") && !gitUrl.startsWith("ssh://")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Git URL",
        message: "URL must start with http, git@, or ssh://",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: `Installing ${name}` });
    try {
      await installPlugin(name, gitUrl);
      toast.style = Toast.Style.Success;
      toast.title = `Installed ${name}`;
      toast.message = gitUrl ? "Custom plugin source added" : undefined;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to install ${name}`;
      toast.message = formatMiseError(error);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Install mise Plugin"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Install Plugin" onSubmit={handleSubmit} icon={Icon.Download} />
        </ActionPanel>
      }
    >
      <Form.Description text="Install a plugin so mise can manage a new tool." />
      <Form.TextField id="name" title="Plugin Name" placeholder="e.g. node, terraform, python" autoFocus />

      <Form.Separator />

      <Form.Description text="Optional: Provide a custom Git URL for the plugin." />
      <Form.TextField id="url" title="Custom Git URL" placeholder="https://github.com/username/plugin-repo.git" />

      {suggestions ? (
        <>
          <Form.Separator />
          <Form.Description title="Popular Plugins" text={suggestions} />
        </>
      ) : null}
    </Form>
  );
}
