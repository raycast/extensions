import { Action, Clipboard, closeMainWindow } from "@raycast/api";
import ActionWithReprompt from "~/components/actions/ActionWithReprompt";

export type CopyWithRepromptActionProps = Omit<Action.Props, "onAction"> & {
  content: string;
};

function CopyWithRepromptAction(props: CopyWithRepromptActionProps) {
  const { content, ...componentProps } = props;

  const copyContent = async () => {
    await Clipboard.copy(content);
    await closeMainWindow();
  };

  return <ActionWithReprompt {...componentProps} onAction={copyContent} repromptDescription={componentProps.title} />;
}

export default CopyWithRepromptAction;
