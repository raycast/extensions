import { Action, Icon } from "@raycast/api";
import { DevelopmentTool } from "../interface";
import AddDrupalWebsiteForm from "./AddDrupalWebsiteForm";

function AddDrupalWebsiteAction(props: {
  defaultTitle?: string;
  onCreate: (title: string, version: string, root: string, tool: DevelopmentTool) => void;
}) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Add Drupal Website"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<AddDrupalWebsiteForm defaultTitle={props.defaultTitle} onCreate={props.onCreate} />}
    />
  );
}

export default AddDrupalWebsiteAction;
