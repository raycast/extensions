import { showToast, Toast } from "@raycast/api";
import { rollDice, flipCoin } from "../utils/helpers";

interface diceProps {
  roll: string;
  before?: string;
  after?: string;
  includeRolls?: boolean;
}

export function rollDiceToast(props: diceProps) {
  const chanceVerb = props.roll.split("d")[1] === "2" ? "Flip" : "Roll";
  const before = props.before !== null && props.before !== undefined ? props.before : "";
  let after = props.after !== null && props.after !== undefined ? props.after : "";

  const rolls = rollDice(props.roll);
  const flips = flipCoin(parseInt(props.roll.split("d")[0]));

  showToast({
    title: `${before}${chanceVerb} ${props.roll}`,
    message: "...",
    style: Toast.Style.Animated,
  });
  setTimeout(() => {
    if (chanceVerb === "Flip") {
      if (props.includeRolls && flips.flips.length > 1) {
        after = " | Flips: " + flips.flips.join(", ").replace(/Tails/g, "T").replace(/Heads/g, "H");
      }
      showToast({
        title: `${before}${chanceVerb}${chanceVerb === "Flip" ? "p" : ""}ed ${props.roll}:`,
        message: `Result: ${flips.result}${after}`,
        style: Toast.Style.Success,
      });
    } else {
      if (props.includeRolls) {
        after = ` | Rolls: ${rolls.rolls.join(", ")}`;
      }
      showToast({
        title: `${before}${chanceVerb}ed ${props.roll}:`,
        message: `Result: ${rolls.total.toString()}${after}`,
        style: Toast.Style.Success,
      });
    }
  }, 1000);
}
