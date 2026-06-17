import { Action, Icon } from "@raycast/api";
import { FormWebsiteUpsert } from "../forms";

interface ActionWebsiteAddInterface {
  onCreate(url: string): void;
}

export const ActionWebsiteAdd = ({ onCreate }: ActionWebsiteAddInterface) => {
  return (
    <Action.Push
      icon={Icon.PlusCircle}
      title="Add Website"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<FormWebsiteUpsert defaultUrl="https://" onCreate={onCreate} />}
    />
  );
};

export default ActionWebsiteAdd;
