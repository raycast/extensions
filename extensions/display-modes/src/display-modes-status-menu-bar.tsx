import { Icon, MenuBarExtra, showHUD, LocalStorage } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { listDisplays, setMode, sortModes, formatDisplayMode, formatDisplayTitle, getDisplayIcon } from "./utils";
import { Mode, areModesEqual } from "./types";

const useDisplays = () => {
  const {
    data: displays,
    isLoading: isLoadingDisplays,
    revalidate: revalidateDisplays,
  } = useCachedPromise(listDisplays);
  const { data: displayNames, isLoading: isLoadingDisplayNames } = useCachedPromise(
    async () => {
      const names = await LocalStorage.getItem<string>("displayNames");
      return names ? JSON.parse(names) : {};
    },
    [],
    { initialData: {} },
  );

  return {
    displays: displays || [],
    isLoading: isLoadingDisplays || isLoadingDisplayNames,
    refetch: revalidateDisplays,
    displayNames: displayNames || {},
  };
};

export default function Command() {
  const { displays, isLoading, refetch, displayNames } = useDisplays();

  const handleModeChange = async (displayId: number, mode: Mode) => {
    try {
      const result = await setMode(displayId, mode);
      if (result) {
        await showHUD(`✅ Display ${displayId} changed to ${formatDisplayMode(mode)}`);
        await refetch();
      } else {
        showFailureToast(`Failed to change display ${displayId} mode`);
      }
    } catch (error) {
      console.error("Error changing display mode:", error);
      showFailureToast("Error changing display mode");
    }
  };

  return (
    <MenuBarExtra icon={Icon.Monitor} tooltip="Display Modes - Click to change resolution" isLoading={isLoading}>
      {displays.length === 0 ? (
        <>
          <MenuBarExtra.Item title="No displays found" icon={Icon.ExclamationMark} />
        </>
      ) : (
        <>
          {displays.map((display) => {
            const availableModes = display.modes.filter((mode) => !mode.unavailable);
            const sortedModes = sortModes(availableModes);
            const displayIcon = getDisplayIcon(display.display.kind);

            return (
              <MenuBarExtra.Submenu
                key={display.display.id}
                title={displayNames[display.display.id] || formatDisplayTitle(display)}
                icon={displayIcon}
              >
                <MenuBarExtra.Section>
                  <MenuBarExtra.Item
                    title={`Current: ${formatDisplayMode(display.currentMode)}`}
                    icon={Icon.CheckCircle}
                  />
                </MenuBarExtra.Section>

                <MenuBarExtra.Section>
                  {sortedModes.length > 0 ? (
                    sortedModes.map((mode, index) => {
                      const isCurrentMode = areModesEqual(mode, display.currentMode);
                      const modeTitle = formatDisplayMode(mode);

                      return (
                        <MenuBarExtra.Item
                          key={index}
                          title={modeTitle}
                          icon={isCurrentMode ? Icon.CheckCircle : Icon.Circle}
                          subtitle={isCurrentMode ? "Current" : undefined}
                          onAction={() => {
                            if (!isCurrentMode) {
                              handleModeChange(display.display.id, mode);
                            }
                          }}
                        />
                      );
                    })
                  ) : (
                    <MenuBarExtra.Item title="No available modes" icon={Icon.ExclamationMark} />
                  )}
                </MenuBarExtra.Section>
              </MenuBarExtra.Submenu>
            );
          })}
        </>
      )}
    </MenuBarExtra>
  );
}
