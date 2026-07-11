import { useEffect, useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import { ItermCommand } from "./core/iterm-command";
import { ErrorToast } from "./core/error-toast";
import { useSelectedItems } from "./core/use-selected-items";

export default function Command() {
  const [command, setCommand] = useState<string>("");
  const { items, error } = useSelectedItems();
  const { windowOrTab } = getPreferenceValues<Preferences.EditInIterm>();

  useEffect(() => {
    if (items.length) {
      setCommand(`$EDITOR ${items.map((item) => `"${item.path}"`).join(" ")}`);
    }
  }, [items]);

  if (error) return <ErrorToast error={error} />;
  if (command)
    return <ItermCommand command={command} loadingMessage="Getting selected file(s)..." location={windowOrTab} />;
  return null;
}
