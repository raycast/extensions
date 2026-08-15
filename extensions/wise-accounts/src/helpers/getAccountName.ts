import { BusinessProfile, PersonalProfile, ProfileType } from "../api/profile";

export const getAccountName = (profile: PersonalProfile | BusinessProfile): string => {
  if (profile.type === ProfileType.PERSONAL) {
    return `${profile.firstName} ${profile.lastName}`;
  } else {
    return profile.name ?? profile.businessName;
  }
};
