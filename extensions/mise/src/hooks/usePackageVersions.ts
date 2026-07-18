import { useState, useEffect } from "react";
import { execAsync } from "../utils/execAsync";

export const usePackageVersions = (packageName: string) => {
  const [packageVersions, setPackageVersions] = useState<(string | number)[]>(
    [],
  );
  useEffect(() => {
    (async () => {
      const { stdout, stderr } = await execAsync(
        `mise ls-remote ${packageName}`,
      );
      if (stderr) return;
      setPackageVersions([
        "latest",
        ...stdout.split("\n").filter(Boolean).reverse(),
      ]);
    })();
  }, [packageName]);

  return packageVersions;
};
