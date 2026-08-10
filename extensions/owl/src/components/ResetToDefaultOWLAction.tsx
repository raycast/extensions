import { Action, Icon } from "@raycast/api";
import { useKeyboards } from "../hooks/keyboards";
import { useLanguages } from "../hooks/languages";
import { useCachedStorage } from "../hooks/storage";
import { OWLMapping } from "../types/owl";
import { StorageKey } from "../types/storage";
import { loadDefaultOWLs } from "../utils/loadDefaultOWLs";

export function ResetToDefaultOWLAction(
  props: Readonly<
    Omit<Action.Props, "title" | "onAction"> & {
      base?: string;
    }
  >,
) {
  const { keyboards } = useKeyboards();
  const { value: languages } = useLanguages();
  const [, setOWLs] = useCachedStorage<OWLMapping>(StorageKey.OWLS, {});

  return (
    <Action
      title={"Reset to Default"}
      style={Action.Style.Destructive}
      icon={Icon.RotateAntiClockwise}
      shortcut={{
        modifiers: ["cmd", "shift"],
        key: "r",
      }}
      {...props}
      onAction={async () => {
        await loadDefaultOWLs({
          keyboards,
          languages,
          setOWLs,
        });
      }}
    />
  );
}
