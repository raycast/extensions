import { Alert, confirmAlert } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { OWL, OWLMapping } from "../types/owl";
import { UseOWLs } from "./owl";

export async function loadDefaultOWLs({
  languages,
  keyboards,
  setOWLs,
  showAlert = true,
}: {
  languages: string[];
  keyboards: string[];
  setOWLs: UseOWLs["setOWLs"];
  showAlert?: boolean;
}): Promise<boolean> {
  const defaultMapping: OWLMapping = Object.fromEntries(
    languages.map((language) => {
      return [
        language,
        languages
          .flatMap((destinationLanguage) => {
            return keyboards.filter((keyboard) => keyboard === destinationLanguage && keyboard !== language);
          })
          .map(
            (keyboard): OWL => ({
              id: randomUUID(),
              from: language,
              to: keyboard,
              history: [],
            }),
          ),
      ];
    }),
  );

  if (showAlert) {
    const shouldLoadDefault = await confirmAlert({
      title: "Are you sure?",
      message: `Are you sure you want to reset the OWLs to the default mapping?\nThis will remove all existing OWLs
          and add all permutations of your existing languages.`,
      primaryAction: {
        title: "Reset",
        style: Alert.ActionStyle.Destructive,
      },
    });

    // The user has been prompted and choose not to load defaults.
    if (!shouldLoadDefault) {
      return false;
    }
  }

  setOWLs(defaultMapping);

  return true;
}
