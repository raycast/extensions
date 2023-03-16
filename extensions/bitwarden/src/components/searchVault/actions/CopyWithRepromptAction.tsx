import { Action, Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";

export type CopyWithRepromptActionProps = Omit<Action.Props, "onAction"> & {
  name?: string;
  repromptDescription?: string;
  content: string;
};

function CopyWithRepromptAction(props: CopyWithRepromptActionProps) {
  const { repromptDescription, name, content, ...componentProps } = props;

  const copyContent = async () => {
    await Clipboard.copy(content);
    await showHUD(name ? `Copied ${name} to clipboard` : "Copied to clipboard");
    await closeMainWindow();
  };

  return <ActionWithReprompt {...componentProps} onAction={copyContent} repromptDescription={repromptDescription} />;
}

export default CopyWithRepromptAction;
