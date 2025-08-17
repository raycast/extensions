import { get } from "./wiseClient";

export enum ProfileType {
  PERSONAL = "PERSONAL",
  BUSINESS = "BUSINESS",
}

export interface PersonalProfile {
  id: number;
  type: ProfileType.PERSONAL;
  firstName: string;
  lastName: string;
  avatar: string;
}

export interface BusinessProfile {
  id: number;
  type: ProfileType.BUSINESS;
  name?: string;
  businessName: string;
}

export const fetchProfiles = async () => {
  return await get<(PersonalProfile | BusinessProfile)[]>("v2/profiles");
};
