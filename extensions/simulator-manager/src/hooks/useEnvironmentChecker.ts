import { useState, useEffect } from "react";
import { findAndroidSdkTool, execAsync } from "../utils/simulator-commands";

export function useEnvironmentChecker() {
  const [androidSdkFound, setAndroidSdkFound] = useState<boolean | null>(null);
  const [xcodeFound, setXcodeFound] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkSDKs() {
      setIsChecking(true);

      try {
        await execAsync("xcrun --version");
        setXcodeFound(true);
      } catch (error) {
        setXcodeFound(false);
      }

      const emulatorPath = findAndroidSdkTool("emulator");
      setAndroidSdkFound(emulatorPath !== null);

      setIsChecking(false);
    }

    checkSDKs();
  }, []);

  return {
    androidSdkFound: androidSdkFound === null ? false : androidSdkFound,
    xcodeFound: xcodeFound === null ? false : xcodeFound,
    isChecking,
  };
}
