import { Action, Tool } from "@raycast/api";
import { getClient } from "../lib/api";
type Input = { penId: string; action: "deploy" | "take-down" };
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message:
    input.action === "deploy"
      ? "Deploy the latest successful saved version to the Pen’s hosted URL?"
      : "Take the Pen’s hosted deployment down?",
  style: input.action === "take-down" ? Action.Style.Destructive : Action.Style.Regular,
  info: [{ name: "Pen ID", value: input.penId }],
});
export default async function tool(input: Input) {
  if (input.action === "deploy") return getClient().deployPen(input.penId);
  await getClient().undeployPen(input.penId);
  return { penId: input.penId, deployed: false };
}
