import { environment } from "@raycast/api";
import { Otp } from "../component/OtpListItem";
import { genericColors, icondir, logos, logoAliases } from "../constants";
import { toId } from "./compare";

const iconLookupKeys = ["logo", "accountType", "name"] as (keyof Otp)[];

const colors = genericColors.map((color) => `authenticator_${color.name}`);

function getIcon(name: Otp[keyof Otp]) {
  if (typeof name !== "string") {
    return;
  }

  const iconId = toId(name);
  if (colors.includes(iconId)) {
    return `${environment.assetsPath}/${icondir}/${icon}.png`;
  } else if (logos.includes(iconId)) {
    const logoIcon = (logoAliases as Record<string, string>)[iconId] || iconId;
    return {
      source: {
        light: `${environment.assetsPath}/${icondir}/light/brand/${logoIcon}.png`,
        dark: `${environment.assetsPath}/${icondir}/dark/brand/${logoIcon}.png`,
      },
    };
  }
}

export function icon(otp: Otp) {
  if (otp === undefined) {
    return `${environment.assetsPath}/${icondir}/authenticator_blue.png`;
  }

  for (const key of iconLookupKeys) {
    const icon = getIcon(otp[key]);
    if (icon) {
      return icon;
    }
  }

  return `${environment.assetsPath}/${icondir}/authenticator_blue.png`;
}
