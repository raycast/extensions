import { showHUD, LaunchProps, Clipboard } from "@raycast/api";

interface Arguments {
  amount: string;
}

const XPF_TO_EUR_RATE = 1 / 119.3317;

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const { amount } = props.arguments;

  const cleanAmount = amount?.toString().trim().replace(",", ".");
  const numAmount = parseFloat(cleanAmount);

  if (!cleanAmount || isNaN(numAmount) || numAmount <= 0) {
    await showHUD("❌ Enter valid XPF amount");
    return;
  }

  const eurAmount = numAmount * XPF_TO_EUR_RATE;
  const formattedEur = (Math.round(eurAmount * 100) / 100).toFixed(2);
  const formattedXpf = numAmount.toLocaleString("fr-FR");

  const eurWithComma = formattedEur.replace(".", ",");

  await Clipboard.copy(eurWithComma);
  await showHUD(`💱 ${formattedXpf} XPF = ${eurWithComma} €`);
}
