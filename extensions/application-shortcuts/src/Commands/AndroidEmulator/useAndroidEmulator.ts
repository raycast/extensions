import { runCommand } from "#/runCommand";
import { useExecPlus } from "#/utils/raycast";

export function useAndroidEmulator() {
  const { isLoading, data } = useExecPlus("emulator -list-avds | grep -v INFO");
  const emulators = data?.split(/\n/).filter(Boolean) || [];
  const createHandleOpen = (emulator: string) => {
    return function handleOpen() {
      return runCommand(`emulator @${emulator}`);
    };
  };
  return {
    isLoading,
    emulators,
    createHandleOpen,
  };
}
