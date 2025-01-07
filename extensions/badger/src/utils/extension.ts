import { getPreferenceValues, launchCommand, LaunchType } from "@raycast/api";

interface BadgerPreferences {
  disableInactive: boolean;
  total: boolean;
  attn: boolean;
  attnDot: string;
  color: string;
  activeColor: string;
}

function useExtension() {
  function launch(name: string) {
    launchCommand({ name, type: LaunchType.UserInitiated });
  }

  function getPreferences() {
    return getPreferenceValues<BadgerPreferences>();
  }

  return { launch, getPreferences };
}

export default useExtension;
