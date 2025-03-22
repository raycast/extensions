import { Color } from "@raycast/api";
import { LDMaintainer } from "../types";

const LD_COLORS = [
  { background: Color.Blue, text: Color.PrimaryText },
  { background: Color.Green, text: Color.PrimaryText },
  { background: Color.Magenta, text: Color.PrimaryText },
  { background: Color.Orange, text: Color.PrimaryText },
  { background: Color.Purple, text: Color.PrimaryText },
];

export const getInitials = (maintainer: LDMaintainer): string => {
  if (maintainer.firstName || maintainer.lastName) {
    return `${maintainer.firstName?.charAt(0) ?? ""}${maintainer.lastName?.charAt(0) ?? ""}`.toUpperCase();
  }
  return maintainer.email.charAt(0).toUpperCase();
};

const getColorPairFromId = (id: string) => {
  const index = Math.abs(hashCode(id)) % LD_COLORS.length;
  return LD_COLORS[index];
};

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

export const createInitialsIcon = (maintainer: LDMaintainer): string => {
  const initials = getInitials(maintainer);
  const { background, text } = getColorPairFromId(maintainer._id);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="${background}"/>
      <text  
        x="12" 
        y="17" 
        text-anchor="middle" 
        dominant-baseline="central"
        fill="${text}" 
        font-family="system-ui, -apple-system"
        font-weight="700"
        font-size="10"
      >${initials}</text>
    </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};
