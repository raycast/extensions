import { LaunchProps, showToast, Toast } from "@raycast/api";
import { asLink, porterLink, send } from "./porter";

export default async function Command(props: LaunchProps<{ arguments: { url: string } }>) {
  const link = asLink(props.arguments.url);
  if (!link) {
    await showToast({ style: Toast.Style.Failure, title: "That isn't a link", message: props.arguments.url });
    return;
  }
  await send(porterLink("open", { url: link }));
}
