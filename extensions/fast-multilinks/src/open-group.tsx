import { LaunchProps, showToast, Toast, LocalStorage } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface LinkGroup {
  id: string;
  name: string;
  urls: string[];
  browser?: string;
}

interface OpenGroupArguments {
  groupName: string;
}

export default async function OpenGroup(props: LaunchProps<{ arguments: OpenGroupArguments }>) {
  const { groupName } = props.arguments;

  const stored = await LocalStorage.getItem<string>("link-groups");
  if (!stored) {
    await showToast({ style: Toast.Style.Failure, title: "No groups found" });
    return;
  }

  let groups: LinkGroup[];
  try {
    groups = JSON.parse(stored);
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to parse groups" });
    return;
  }

  const group = groups.find((g) => g.name.toLowerCase() === groupName.toLowerCase());
  if (!group) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Group not found",
      message: `No group named "${groupName}"`,
    });
    return;
  }

  for (const url of group.urls) {
    if (group.browser) {
      await execAsync(`open -a "${group.browser}" "${url}"`);
    } else {
      await execAsync(`open "${url}"`);
    }
  }
  await showToast({
    style: Toast.Style.Success,
    title: `Opened ${group.name}`,
    message: `Browser: ${group.browser || "default"}`,
  });
}
