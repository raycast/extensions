import { execSync } from "child_process";
import { useMemo } from "react";

export const useHasMiseInstalled = () => {
  return useMemo(() => {
    try {
      const hasMise = execSync("which mise").toString().trim();
      return !!hasMise;
    } catch {
      return false;
    }
  }, []);
};
