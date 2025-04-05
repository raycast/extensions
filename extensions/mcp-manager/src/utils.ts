import fs from "fs";

export function getDescription(filePath: string): string {
  try {
    const descriptionPath = `${filePath}.description`;
    if (fs.existsSync(descriptionPath)) {
      return fs.readFileSync(descriptionPath, "utf-8");
    }
    return "";
  } catch {
    return "";
  }
}
