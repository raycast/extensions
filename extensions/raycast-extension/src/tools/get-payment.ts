import { runTool } from "./_shared";

interface Input {
  id: string;
}

export default async function getPaymentTool(input: Input) {
  return runTool(["payment", input.id.trim()]);
}
