import { getPreferenceValues } from "@raycast/api";
import * as fs from "node:fs";
import path from "node:path";

interface Preferences {
  hockeyStackPath: string;
}

export async function getCustomers(): Promise<{ title: string; value: string }[]> {
  const preferences = getPreferenceValues<Preferences>();
  const filePath = path.join(preferences.hockeyStackPath, "domain-info.txt");
  const text = fs.readFileSync(filePath, "utf8");

  const lines = text.split("\n").filter((line) => line.includes(" - "));
  return lines.map((line) => {
    const [, name, domain] = line.split(" - ");
    return { title: name, value: domain };
  });
}
