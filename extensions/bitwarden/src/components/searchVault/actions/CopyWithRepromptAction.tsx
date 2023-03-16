import { Action, Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";

export type CopyWithRepromptActionProps = Omit<Action.Props, "onAction"> & {
  name?: string;
  content: string;
};

function CopyWithRepromptAction(props: CopyWithRepromptActionProps) {
  const { name, content, ...componentProps } = props;

  const copyContent = async () => {
    await Clipboard.copy(content);
    await showHUD(name ? `Copied ${name} to clipboard` : "Copied to clipboard");
    await closeMainWindow();
  };

  return <ActionWithReprompt {...componentProps} onAction={copyContent} repromptDescription={componentProps.title} />;
}

export default CopyWithRepromptAction;
