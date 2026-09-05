import { popToRoot, showToast, Toast } from "@raycast/api";
import { ServerForm, ServerFormInput } from "./components/ServerForm";
import { addServer } from "./lib/storage";

export default function Command() {
  async function handleSave(values: ServerFormInput) {
    await addServer(values);
    await showToast({
      style: Toast.Style.Success,
      title: "Server added",
      message: values.alias ?? `${values.host}/${values.path}`,
    });
    await popToRoot();
  }

  return <ServerForm submitTitle="Add Server" onSave={handleSave} />;
}
