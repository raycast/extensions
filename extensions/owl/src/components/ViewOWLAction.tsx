import { Action, Icon } from "@raycast/api";
import { OWL } from "../types/owl";
import ViewOWL from "./ViewOWL";

export function ViewOWLAction({ owl }: Readonly<{ owl: OWL }>) {
  return <Action.Push title={"View Owl"} icon={Icon.AppWindowSidebarRight} target={<ViewOWL owl={owl} />} />;
}
