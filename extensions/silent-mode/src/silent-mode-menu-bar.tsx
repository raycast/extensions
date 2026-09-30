import { Icon, MenuBarExtra } from "@raycast/api";
import { usePromise, showFailureToast } from "@raycast/utils";
import { checkIfSilentMode, toggleSilentMode } from "./utils/alert";

export default function Command() {
  const { isLoading, data: isSilentMode, revalidate: revalidateSilentMode } = usePromise(checkIfSilentMode);

  return (
    <MenuBarExtra isLoading={isLoading} icon={isSilentMode ? Icon.BellDisabled : Icon.Bell}>
      <MenuBarExtra.Item
        title={`Turn ${isSilentMode ? "off" : "on"} Silent Mode`}
        onAction={async () => {
          try {
            await toggleSilentMode();
            await revalidateSilentMode();
          } catch (error) {
            showFailureToast(error);
          }
        }}
      />
    </MenuBarExtra>
  );
}
