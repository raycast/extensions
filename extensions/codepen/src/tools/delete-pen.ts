import { Action, Tool } from "@raycast/api";
import { getClient } from "../lib/api";
type Input = { penId: string };
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Move this Pen to the trash? It can be restored on CodePen for 3 days.",
  style: Action.Style.Destructive,
  info: [{ name: "Pen ID", value: input.penId }],
});
export default async function tool({ penId }: Input) {
  await getClient().deletePen(penId);
  return { penId, trashed: true };
}
