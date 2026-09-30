import { LaunchProps } from "@raycast/api";
import { AddTranslationForm } from "./components/add-translation-form";
import type { Platform } from "./types";

interface AddTranslationArguments {
  keyName?: string;
  translationValue?: string;
  description?: string;
  isPlural?: string;
  platform?: Platform;
  assignedFile?: string;
}

export default function Command(props: LaunchProps<{ arguments: AddTranslationArguments }>) {
  const { keyName, translationValue, description, isPlural, platform, assignedFile } = props.arguments;

  return (
    <AddTranslationForm
      draftValues={{
        keyName,
        translationValue,
        description,
        isPlural: isPlural === "true",
        platform,
        assignedFile,
      }}
    />
  );
}
