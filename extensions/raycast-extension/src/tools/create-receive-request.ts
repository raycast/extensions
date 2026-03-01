import { runTool } from "./_shared";

interface Input {
  amountSats?: number;
  description?: string;
  isStatic?: boolean;
}

export default async function createReceiveRequestTool(input: Input) {
  const args = ["receive"];

  if (typeof input.amountSats === "number") {
    args.push(String(input.amountSats));
  }

  if (input.description && input.description.trim().length > 0) {
    if (args.length === 1) {
      args.push("0");
    }
    args.push(input.description.trim());
  }

  if (input.isStatic) {
    args.push("--static");
  }

  return runTool(args);
}
