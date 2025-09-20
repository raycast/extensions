import { ProfilesResponse } from "./../interfaces/profile";
import axiosClient from "./axios";
export const listProfiles = async () => {
  const res = await axiosClient.get("/profiles");

  const data = res.data as ProfilesResponse;

  if (!data.success) {
    throw new Error(`Failed to get profiles`);
  }

  return data.body.profiles;
};
