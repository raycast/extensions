import { showHUD, Clipboard } from "@raycast/api";

interface PickFigureArguments {
  min?: string;
  max?: string;
}

export default async function PickFigure(props: { arguments: PickFigureArguments }) {
  const { min = "0", max = "9" } = props.arguments;
  const minNumber = Number(min || "0");
  const maxNumber = Number(max || "9");
  if (isNaN(minNumber) || isNaN(maxNumber)) {
    await showHUD("❌ Invalid arguments");
    return;
  }

  const random = Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber;
  const result = String(random);
  await Clipboard.copy(result);
  await showHUD(`Copied ${result} to clipboard`);
}
