import { environment } from "@raycast/api";

export function getAsset(iconName: string) {
  return `${iconName}-${environment.theme}.svg`;
}
