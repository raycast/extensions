import { LaunchType, launchCommand } from "@raycast/api";
import { createDeeplinkForDocset } from "./utils";

export default async function Command(props: { arguments: { docset: string } }) {
  const { docset } = props.arguments;
  const deeplink = createDeeplinkForDocset(docset);

  await launchCommand({
    ownerOrAuthorName: "raycast",
    extensionName: "raycast",
    name: "create-quicklink",
    type: LaunchType.UserInitiated,
    fallbackText: deeplink,
  });
}
