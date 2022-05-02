import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  secret: string;
}

export default function main() {
  const preferences = getPreferenceValues<Preferences>();

  console.log(preferences);
}
