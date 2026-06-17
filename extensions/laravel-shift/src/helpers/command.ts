import { Command, FormValues, Options, Preferences } from "../types/shifts";
import { getPreferenceValues } from "@raycast/api";

export async function buildDockerCommand(values: FormValues): Promise<Command> {
  const mount = values.projectPath;

  const preferences = getPreferenceValues<Preferences>();

  const options: Options = {
    SHIFT_CODE: values.shiftCode,
    SHIFT_TOKEN: preferences?.dockerToken || null,
    GIT_AUTHOR: preferences?.gitAuthorName || null,
    GIT_EMAIL: preferences?.gitAuthorEmail || null,
  };

  const envCommand = Object.entries(options)
    .filter(([, value]) => value !== null)
    .map(([key, value]) => `-e ${key}=${value}`)
    .join(" ");

  return `docker run -v ${mount}:/project:delegated ${envCommand} shift`;
}
