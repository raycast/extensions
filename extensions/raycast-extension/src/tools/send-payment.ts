import { runTool } from "./_shared";

interface Input {
  destination: string;
  amountSats: number;
}

export default async function sendPaymentTool(input: Input) {
  return runTool(["send", input.destination.trim(), String(input.amountSats)]);
}
