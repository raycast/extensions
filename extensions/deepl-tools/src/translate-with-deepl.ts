import { LaunchProps } from "@raycast/api";
import { runTranslationCommand } from "./translation-runner";

type TranslateWithDeepLArguments = {
  text?: string;
};

export default async function Command(props: LaunchProps<{ arguments: TranslateWithDeepLArguments }>) {
  await runTranslationCommand(props);
}
