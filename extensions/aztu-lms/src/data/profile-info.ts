import { authedFetch } from "@/lib/auth";

export type ProfileInfo = {
  basicInfo: {
    userId: number;
    name: string;
    surname: string;
    fatherName: string;
    gender: string;
    phone: string | null;
    mobilePhone: string;
    address: string | null;
    birthday: string | null;
  };
  academicInfo: {
    course: string;
    status: string;
    registerType: string;
  };
  additionalInfo: {
    photo: null;
  };
};

export async function getProfileInfo() {
  const response = await authedFetch("profile", { method: "GET" });

  const data = (await response.json()) as ProfileInfo;

  if (!data.basicInfo) return null;

  return data;
}
