import { useState, useEffect } from "react";
import { LocalStorage } from "@raycast/api";
import { checkOiiotoolInstalled, checkExiftoolInstalled } from "./utils";
import { FORMATS } from "./constants";

export function useDependencyCheck() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasOiiotool, setHasOiiotool] = useState(false);
  const [hasExiftool, setHasExiftool] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string>("jpg");
  const [selectedCompression, setSelectedCompression] = useState<string>(
    FORMATS["jpg"].compressions[0].value,
  );

  const checkDependencies = async () => {
    setIsLoading(true);
    const oiiotoolInstalled = await checkOiiotoolInstalled();
    const exiftoolInstalled = await checkExiftoolInstalled();
    setHasOiiotool(oiiotoolInstalled);
    setHasExiftool(exiftoolInstalled);

    // Load saved settings
    const savedFormat = await LocalStorage.getItem<string>("selectedFormat");
    const savedCompression = await LocalStorage.getItem<string>(
      "selectedCompression",
    );

    if (savedFormat && FORMATS[savedFormat]) {
      setSelectedFormat(savedFormat);
      if (savedCompression) {
        // Verify the saved compression is valid for the format
        const isValidCompression = FORMATS[savedFormat].compressions.some(
          (c) => c.value === savedCompression,
        );
        if (isValidCompression) {
          setSelectedCompression(savedCompression);
        } else {
          setSelectedCompression(FORMATS[savedFormat].compressions[0].value);
        }
      } else {
        setSelectedCompression(FORMATS[savedFormat].compressions[0].value);
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    checkDependencies();
  }, []);

  return {
    isLoading,
    hasOiiotool,
    hasExiftool,
    selectedFormat,
    setSelectedFormat,
    selectedCompression,
    setSelectedCompression,
    checkDependencies,
  };
}
