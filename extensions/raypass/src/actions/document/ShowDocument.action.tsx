import { Action, Icon } from "@raycast/api";
import { misc } from "../../utils";

interface Props {
  name: string;
}

export const ShowDocument: React.FC<Props> = ({ name }) => (
  <Action.ShowInFinder
    title="Reveal Document"
    path={misc.getDocLocation(name)}
    icon={Icon.Finder}
    shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
  />
);
