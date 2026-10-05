import { Action, Icon } from "@raycast/api";
import { ChooseDirectory } from "../forms/ChooseDirectory.js";

export function ChooseSpecificRepo() {
  return <Action.Push title="Choose Specific Repo" icon={Icon.Folder} target={<ChooseDirectory />} />;
}
