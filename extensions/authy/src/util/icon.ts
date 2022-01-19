import { environment } from "@raycast/api";
import { Otp } from "../component/OtpList";
import { genericColors, icondir, logos } from "../constants";

const colors = genericColors.map((color) => `authenticator_${color.name}`);

function getIcon(name: string) {
  const icon = name.toLowerCase();
  if (colors.includes(icon)) {
    return `${environment.assetsPath}/${icondir}/${icon}.png`;
  } else if (logos.includes(icon)) {
    return {
      source: {
        light: `${environment.assetsPath}/${icondir}/light/brand/${icon}.png`,
        dark: `${environment.assetsPath}/${icondir}/dark/brand/${icon}.png`,
      },
    };
  }
}

export function icon(otp: Otp) {
  if (otp === undefined) {
    return `${environment.assetsPath}/${icondir}/authenticator_blue.png`;
  }
  for (const [, val] of Object.entries(otp)
    .filter(([prop]) => prop === "logo" || prop === "accountType")
    .sort(([prop]) => (prop === "logo" ? -1 : 1))) {
    if (typeof val !== "string") {
      continue;
    }
    const icon = getIcon(val);
    if (icon !== undefined) {
      return icon;
    }
  }
  return `${environment.assetsPath}/${icondir}/authenticator_blue.png`;
}
