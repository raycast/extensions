import { getPreferenceValues } from "@raycast/api";

export const linkDomain = () => {
  return getPreferenceValues()["domain"] || "app." + getPreferenceValues()["server"];
};

interface Identifiable {
  id: number;
}

export function moveBetween(from: Array<Identifiable>, to: Array<Identifiable>, id: number): void {
  from.forEach((el, idx) => {
    if (el.id === id) {
      to.push(el);
      from.splice(idx, 1);
      return;
    }
  });
}
