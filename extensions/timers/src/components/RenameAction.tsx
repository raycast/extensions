import { Action, Icon, useNavigation } from "@raycast/api";
import { RenameView, RenameViewProps } from "./RenameView";

interface RenameActionProps extends RenameViewProps {
  renameLabel: string;
}

export default function RenameAction(props: RenameActionProps) {
  const { push } = useNavigation();

  return (
    <Action
      title={`Rename ${props.renameLabel}`}
      icon={Icon.TextInput}
      onAction={() =>
        push(<RenameView currentName={props.currentName} originalFile={props.originalFile} ctID={props.ctID} />)
      }
    />
  );
}
