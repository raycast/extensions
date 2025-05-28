import { Action, Icon, confirmAlert, showToast } from "@raycast/api";
import { installExamples } from "../../lib/defaults";

/**
 * Action to install example pins. Only shows if examples are not installed and no pins have been created.
 * @param props.setExamplesInstalled The function to set the examples installed state.
 * @param props.revalidatePins The function to revalidate the pins.
 * @param props.revalidateGroups The function to revalidate the groups.
 * @param props.kind The kind of examples to install (pins or groups).
 * @returns An action component.
 */
export const InstallExamplesAction = (props: {
  setExamplesInstalled: React.Dispatch<React.SetStateAction<boolean>>;
  revalidatePins?: () => Promise<void>;
  revalidateGroups: () => Promise<void>;
  kind: "pins" | "groups";
}) => {
  const { setExamplesInstalled, revalidatePins, revalidateGroups, kind } = props;
  const kindLabel = kind == "pins" ? "Pins" : "Groups";
  return (
    <Action
      title={`Install Example ${kindLabel}`}
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onAction={async () => {
        if (
          await confirmAlert({
            title: `Install Example ${kindLabel}?`,
            message:
              kind == "pins"
                ? "This will install example pins and any groups they belong to. This wil NOT overwrite any existing pins or groups."
                : "This will install several example groups to get you started. No pins will be installed. This wil NOT overwrite any existing groups.",
            primaryAction: { title: "Install" },
          })
        ) {
          await installExamples(kind);
          setExamplesInstalled(true);
          await revalidatePins?.();
          await revalidateGroups();
          await showToast({ title: `Installed Example ${kindLabel}` });
        }
      }}
    />
  );
};
