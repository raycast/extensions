import { useState } from "react";
import { DefaultTimerPreset } from "../backend/types";
import { readDefaultPresetVisibles, toggleDefaultPresetVisibility } from "../backend/timerBackend";

export default function useDefaultPresetVisibles() {
  const defaultPresets: DefaultTimerPreset[] = [
    {
      key: "2M",
      title: "2 Minute Timer",
      seconds: 60 * 2,
    },
    {
      key: "5M",
      title: "5 Minute Timer",
      seconds: 60 * 5,
    },
    {
      key: "10M",
      title: "10 Minute Timer",
      seconds: 60 * 10,
    },
    {
      key: "15M",
      title: "15 Minute Timer",
      seconds: 60 * 15,
    },
    {
      key: "30M",
      title: "30 Minute Timer",
      seconds: 60 * 30,
    },
    {
      key: "45M",
      title: "45 Minute Timer",
      seconds: 60 * 45,
    },
    {
      key: "60M",
      title: "60 Minute Timer",
      seconds: 60 * 60,
    },
    {
      key: "90M",
      title: "90 Minute Timer",
      seconds: 60 * 60 * 1.5,
    },
  ];

  const [defaultVisibles, setDefaultVisibles] = useState<Record<string, boolean> | undefined>();
  const [isLoadingVisibles, setIsLoadingVisibles] = useState<boolean>(defaultVisibles === undefined);

  const refreshDefaultVisibles = () => {
    setDefaultVisibles(readDefaultPresetVisibles());
    setIsLoadingVisibles(false);
  };

  const handleDefaultPresetToggle = (key: string) => {
    toggleDefaultPresetVisibility(key);
    refreshDefaultVisibles();
  };

  return {
    defaultPresets,
    defaultVisibles,
    isLoadingVisibles,
    refreshDefaultVisibles,
    handleDefaultPresetToggle,
  };
}
