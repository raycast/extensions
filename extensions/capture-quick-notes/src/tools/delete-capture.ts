import { Tool } from "@raycast/api";
import { deleteCapture, getCapture } from "../capture-cli";

type Input = {
  /** The id of the capture to delete, as returned by the get-captures tool. */
  id: string;
};

export default async function (input: Input) {
  return await deleteCapture(input.id);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const capture = await getCapture(input.id);
  return {
    message: "Are you sure you want to permanently delete this capture?",
    info: [
      {
        name: "Capture",
        value: capture.content || capture.urls[0] || "Untitled Capture",
      },
    ],
  };
};
