import { IconMode, type Profile } from "../types/types";

export const profileSubtitle = (profile: Profile): string =>
  profile.iconMode !== IconMode.None ? `${profile.iconStyle} \u00b7 ${profile.iconMode}` : profile.iconStyle;
