import { useCachedState } from "@raycast/utils";
import { SYSTEM_DEFAULT } from "@/utils";

export const useSaySettings = () => {
  const [voice, setVoice] = useCachedState<string>("voice", SYSTEM_DEFAULT);
  const [rate, setRate] = useCachedState<string>("rate", SYSTEM_DEFAULT);
  const [device, setAudioDevice] = useCachedState<string>("audioDevice", SYSTEM_DEFAULT);
  const [keepSilentOnError, setKeepSilentOnError] = useCachedState<boolean>("keepSilentOnError", false);
  return { voice, rate, device, keepSilentOnError, setVoice, setRate, setAudioDevice, setKeepSilentOnError };
};
