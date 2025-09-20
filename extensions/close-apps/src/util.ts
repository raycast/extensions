import fs from "node:fs";

export const extractIcon = (appName: string) => {
  const applicationPaths = [`/Applications/${appName}.app`, `/System/Applications/${appName}.app`];
  return (
    applicationPaths.find((path) => {
      try {
        return fs.existsSync(path);
      } catch {
        return false;
      }
    }) || `/Applications/${appName}.app`
  );
};
