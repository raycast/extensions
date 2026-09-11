import { Svg } from "../type";

export const getSvgRouteSource = (route: Svg["route"]) => ({
  light: typeof route === "string" ? route : route.light,
  dark: typeof route === "string" ? route : route.dark,
});
