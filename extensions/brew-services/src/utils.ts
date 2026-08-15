import { Image, Icon, Color } from "@raycast/api";
import { execaCommand } from "execa";

export function createIcon(status: string): Image.ImageLike {
  switch (status) {
    case "started":
      return { source: Icon.Play, tintColor: Color.Green };
    case "running":
      return { source: Icon.PlayFilled, tintColor: Color.Green };
    case "error":
      return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
    case "none":
      return { source: Icon.Stop, tintColor: Color.PrimaryText };
    default:
      return { source: Icon.QuestionMark, tintColor: Color.Red };
  }
}

export async function runShellScript(command: string) {
  const { stdout } = await execaCommand(command);
  return stdout;
}
