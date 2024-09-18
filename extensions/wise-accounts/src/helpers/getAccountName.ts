import { BusinessProfile, PersonalProfile } from "../api/profile";

export const getAccountName = (profile: PersonalProfile | BusinessProfile): string => {
  if (profile.type === "PERSONAL") {
    return `${(profile as PersonalProfile).firstName} ${(profile as PersonalProfile).lastName}`;
  } else {
    return (profile as BusinessProfile).name;
  }
};
