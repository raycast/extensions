import { getPreferenceValues } from "@raycast/api";

export type UserPreferenceValues = {
  travelPlanner: WebPlanner;
};
export function getWebPlannerConfig() {
  const preferences: UserPreferenceValues = getPreferenceValues();
  const id: WebPlanner =
    "web-planner" in preferences ? (preferences["web-planner"] as WebPlanner) : WebPlanner.Reis;
  return mapToWebPlannerConfig(id);
}

enum WebPlanner {
  Reis = "reis",
  Fram = "fram",
  Atb = "atb",
  Svipper = "svipper",
}
export type WebPlannerConfig = {
  id: WebPlanner;
  name: string;
  url: string;
  favicon?: string;
};
const mapToWebPlannerConfig = (id: string): WebPlannerConfig => {
  switch (id) {
    case "fram":
      return {
        id: WebPlanner.Fram,
        name: "FRAM Travel Search",
        url: "https://reise.frammr.no",
      };
    case "svipper":
      return {
        id: WebPlanner.Svipper,
        name: "Svipper Travel Search",
        url: "https://reise.svipper.no",
      };
    case "atb":
      return {
        id: WebPlanner.Atb,
        name: "AtB Travel Search",
        url: "https://reise.atb.no",
      };
    case "reis":
    default:
      return {
        id: WebPlanner.Reis,
        name: "Reis Travel Search",
        url: "https://reise.reisnordland.no",
      };
  }
};
