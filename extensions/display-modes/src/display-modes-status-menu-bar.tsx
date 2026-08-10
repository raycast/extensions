import { useEffect, useState } from "react";
import { Icon, MenuBarExtra, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { listDisplays, setMode, sortModes, formatDisplayMode, formatDisplayTitle, getDisplayIcon } from "./utils";
import { DisplayInfo, Mode, areModesEqual } from "./types";

const useDisplays = () => {
  const [state, setState] = useState<{ displays: DisplayInfo[]; isLoading: boolean }>({
    displays: [],
    isLoading: true,
  });

  const fetchDisplays = async () => {
    try {
      const displays = await listDisplays();
      setState({
        displays: displays || [],
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to fetch displays:", error);
      showFailureToast("Failed to fetch displays");
      setState({
        displays: [],
        isLoading: false,
      });
    }
  };

  useEffect(() => {
    fetchDisplays();
  }, []);

  return { ...state, refetch: fetchDisplays };
};

export default function Command() {
  const { displays, isLoading, refetch } = useDisplays();

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
              <MenuBarExtra.Submenu key={display.display.id} title={formatDisplayTitle(display)} icon={displayIcon}>
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
