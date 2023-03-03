import { Icon } from "@raycast/api";
import { mastodon } from "masto";

type StatusVisibility = mastodon.v1.StatusVisibility;

const ICON_MAP: Record<StatusVisibility, Icon> = {
  public: Icon.Globe,
  unlisted: Icon.LockUnlocked,
  private: Icon.Lock,
  direct: Icon.AtSymbol,
};

const NAME_MAP: Record<StatusVisibility, string> = {
  public: "Public",
  unlisted: "Unlisted",
  private: "Private",
  direct: "Mentioned Only",
};

export function getIconForVisibility(visibility: StatusVisibility): Icon {
  return ICON_MAP[visibility];
}

export function getNameForVisibility(visibility: StatusVisibility) {
  return NAME_MAP[visibility];
}

export function isVisiblityPrivate(visibility: StatusVisibility) {
  return visibility === "private" || visibility === "direct";
}
