import { Clipboard, LaunchProps, showHUD } from "@raycast/api";
import { DiceRoll } from "@dice-roller/rpg-dice-roller";

export default async function Command(props: LaunchProps<{ arguments: Arguments.RollDice }>) {
  const { expression } = props.arguments;

  const roll = new DiceRoll(expression);

  await Clipboard.copy(roll.total);

  await showHUD(`🎲 ${roll.output}`, { clearRootSearch: false });
}
