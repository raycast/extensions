import { Action, Tool } from "@raycast/api";
import { removeNamedPort } from "../utilities/namedPortStore";

type Input = {
  /** The TCP port whose saved name should be removed. */
  port: number;
};

export const confirmation: Tool.Confirmation<Input> = async ({ port }) => ({
  style: Action.Style.Destructive,
  message: `Delete the saved name for port ${port}?`,
});

/** Delete a saved port name without killing its process. */
export default function tool({ port }: Input) {
  return removeNamedPort(port);
}
