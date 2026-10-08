import { environment } from "@raycast/api";

const PopiconLogo = {
  Light: `${environment.assetsPath}/popicon-logo-light.svg`,
  Dark: `${environment.assetsPath}/popicon-logo-dark.svg`,
} as const;

type PopiconLogo = (typeof PopiconLogo)[keyof typeof PopiconLogo];

export { PopiconLogo };
