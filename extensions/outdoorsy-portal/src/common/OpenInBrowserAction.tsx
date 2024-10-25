import { Action, Icon, Image } from "@raycast/api";
import { openUrlInDefaultBrowser } from "../utils/browser";

interface IOpenInBrowserActionProps {
  url: string;
  title?: string;
  icon?: Image.ImageLike;
}

export default function OpenInBrowserAction(props: IOpenInBrowserActionProps) {
  const { url, title, icon } = props;

  return (
    <Action title={title || 'Open in Browser'} icon={icon || Icon.Globe} onAction={() => openUrlInDefaultBrowser(url)} />
  )
}
