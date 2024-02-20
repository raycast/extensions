import { get } from "./wiseClient";
type ProfileType = "PERSONAL" | "BUSINESS";
export interface PersonalProfile {
  id: number;
  type: ProfileType;
  firstName: string;
  lastName: string;
  avatar: string;
}

export interface BusinessProfile {
  id: number;
  type: ProfileType;
  name: string;
}
export const fetchProfiles = async () => {
  return await get<(PersonalProfile | BusinessProfile)[]>("v2/profiles");
};
