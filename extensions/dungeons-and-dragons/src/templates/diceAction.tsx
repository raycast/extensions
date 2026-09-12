import { Action, Icon } from "@raycast/api";
import { rollDiceToast } from "../utils/toasts";

interface diceProps {
  roll: string;
  icon?: string;
  title?: string;
  before?: string;
  after?: string;
}

export default function DiceAction(props: diceProps) {
  const chanceVerb = props.roll.split("d")[1] === "2" ? "Flip" : "Roll";

  return (
    <Action
      title={`${props.title ?? ""} ${chanceVerb ?? ""} ${props.roll}`}
      icon={props.icon || Icon.Star}
      onAction={() => {
        rollDiceToast(props);
      }}
    />
  );
}
