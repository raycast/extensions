import { runTool } from "./_shared";

interface Input {
  amountSats?: number;
  minSats?: number;
  maxSats?: number;
  multiUse?: boolean;
  maxUses?: number;
  title?: string;
  description?: string;
  orderId?: string;
  customerRef?: string;
  campaign?: string;
}

export default async function createPaylinkTool(input: Input) {
  const args = ["paylink", "create"];

  if (typeof input.amountSats === "number") {
    args.push(String(input.amountSats));
  }

  if (typeof input.minSats === "number") {
    args.push("--min-sats", String(input.minSats));
  }

  if (typeof input.maxSats === "number") {
    args.push("--max-sats", String(input.maxSats));
  }

  if (input.multiUse) {
    args.push("--multi-use");
  }

  if (typeof input.maxUses === "number") {
    args.push("--max-uses", String(input.maxUses));
  }

  appendStringOption(args, "--title", input.title);
  appendStringOption(args, "--description", input.description);
  appendStringOption(args, "--order-id", input.orderId);
  appendStringOption(args, "--customer-ref", input.customerRef);
  appendStringOption(args, "--campaign", input.campaign);

  return runTool(args);
}

function appendStringOption(args: string[], flag: string, value: string | undefined): void {
  if (!value) {
    return;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return;
  }

  args.push(flag, trimmed);
}
