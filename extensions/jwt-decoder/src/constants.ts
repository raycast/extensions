import { environment } from "@raycast/api";
import path from "path";

export const claimsPath: string = path.join(environment.assetsPath, "claims.csv");
export const jwtLogo = `file://${environment.assetsPath}/jwt.svg`;
export const textWidth = 42;
export const textWidthWide = 64;
export const textOffSet = 70;
export const textLineHeight = 12;
export const textLineStandardOffset = -1;
export const twRegex = new RegExp(`.{1,${textWidth}}`, "g");
export const dataTextOffset = 300;

export const titleColor = environment.appearance === "light" ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)";
export const headColor = "rgb(251, 1, 91)";
export const dataColor = `rgb(214, 58, 255)`;
export const footColor = "rgb(0, 185, 241)";
export const subColor = "rgb(151, 151, 151)";
