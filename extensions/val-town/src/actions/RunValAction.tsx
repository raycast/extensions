import { Action, Icon } from "@raycast/api";
import { RunVal, UserVal, Val } from "../types";
import { ValRun } from "../components/ValRun";
import { ValRunWithArgs } from "../components/ValRunWithArgs";

export const RunValAction = ({ val }: { val: Val | RunVal | UserVal }) => (
  <>
    <Action.Push target={<ValRun val={val} />} title="Run Val" icon={Icon.Play} />
    <Action.Push
      target={<ValRunWithArgs val={val} />}
      title="Run Val With Args"
      icon={Icon.Play}
      shortcut={{
        modifiers: ["cmd", "shift"],
        key: "enter",
      }}
    />
  </>
);
