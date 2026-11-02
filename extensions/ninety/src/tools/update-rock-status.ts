import { Tool } from "@raycast/api";
import { updateRock } from "../api/ninety";

type Input = {
  /** The Rock Id (from get-rocks). */
  rockId: string;
  /** The Rock title, shown in the confirmation. */
  title?: string;
  /** The new status. */
  status: "ON_TRACK" | "OFF_TRACK" | "DONE" | "CANCELED";
};

export default async function tool({ rockId, status }: Input) {
  const rock = await updateRock(rockId, { statusCode: status });
  return { id: rock._id, title: rock.title, status: rock.statusCode };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Update this Rock's status?",
  info: [
    { name: "Rock", value: input.title ?? input.rockId },
    { name: "Status", value: input.status },
  ],
});
