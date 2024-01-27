import { Icon, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { useHAStates } from "@components/hooks";
import { MenuBarExtraEntity } from "@components/state/menu";
import { getErrorMessage } from "@lib/utils";

function getEntityID() {
  const prefs = getPreferenceValues();
  const result = prefs.entity as string | undefined;
  return result ?? "";
}

export default function SingleEntityMenuBarCommand() {
  const { states, error, isLoading } = useHAStates();
  if (error) {
    return <MenuBarExtra title="?" icon={Icon.Warning} tooltip={getErrorMessage(error)} />;
  }
  const entityID = getEntityID();
  const entity = states?.find((state) => state.entity_id === entityID);
  return <MenuBarExtraEntity state={entity} isLoading={isLoading} />;
}
