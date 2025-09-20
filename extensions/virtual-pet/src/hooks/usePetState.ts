import { Toast, showToast } from "@raycast/api";
import { PetState, ActionName } from "../types";
import { useLocalStorage } from "@raycast/utils";
import { PET_STATE_KEY } from "../utils/consts";

export function usePetState() {
  const {
    value: petState,
    setValue: setPetState,
    removeValue: removePetState,
    isLoading,
  } = useLocalStorage<PetState | null>(PET_STATE_KEY, null);

  const handleAction = async (action: (state: PetState) => PetState, actionName: ActionName) => {
    if (!petState) return;

    // Don't allow actions while sleeping (except wake up and checking status)
    if (petState.isSleeping && actionName !== ActionName.CheckingStatus && actionName !== ActionName.WakeUp) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Your pet is sleeping!",
        message: "You should let them rest or wake them up.",
      });
      return;
    }

    const newState = action(petState);
    setPetState(newState);

    if (actionName === ActionName.WakeUp) {
      await showToast({
        style: Toast.Style.Success,
        title: "Pet woken up!",
        message: "Your pet seems a bit groggy from being woken up early.",
      });
    } else if (actionName === ActionName.Playing && petState.energy <= 20) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Pet is too tired to play!",
        message: "You should let them rest a bit.",
      });
      return;
    } else if (actionName !== ActionName.CheckingStatus) {
      await showToast({
        style: Toast.Style.Success,
        title: `${actionName} successful!`,
      });
    }
  };

  return {
    petState,
    setPetState,
    isLoading,
    handleAction,
    removePetState,
  };
}
