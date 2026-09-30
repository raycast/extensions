import { useState, useEffect, useCallback } from "react";
import { findAndroidSdkTool, execAsync } from "../utils/simulator-commands";

export function useEnvironmentChecker() {
  const [androidSdkFound, setAndroidSdkFound] = useState<boolean | null>(null);
  const [xcodeFound, setXcodeFound] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const checkSDKs = useCallback(async () => {
    setIsChecking(true);

    const checkXcode = async () => {
      try {
        await execAsync("xcrun --version");
        return true;
      } catch {
        return false;
      }
    };

    const checkAndroidSDK = () => {
      const emulatorPath = findAndroidSdkTool("emulator");
      return emulatorPath !== null;
    };

    const [xcodeResult, androidResult] = await Promise.all([checkXcode(), checkAndroidSDK()]);

    setXcodeFound(xcodeResult);
    setAndroidSdkFound(androidResult);
    setIsChecking(false);
  }, []);

  useEffect(() => {
    checkSDKs();
  }, [checkSDKs]);

  return {
    androidSdkFound: androidSdkFound ?? false,
    xcodeFound: xcodeFound ?? false,
    isChecking,
  };
}
