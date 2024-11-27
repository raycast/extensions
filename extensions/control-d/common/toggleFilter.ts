import { ToggleFilterResponse } from "./../interfaces/toggleFilter";
import axiosClient from "./axios";
export const toggleFilter = async (profileId: string, filterId: string, enabled: boolean) => {
  const res = await axiosClient.put(`/profiles/${profileId}/filters/filter/${filterId}`, {
    status: enabled ? 1 : 0,
    profile_id: profileId,
    filter: filterId,
  });

  const data: ToggleFilterResponse = res.data;

  if (!data.success) {
    throw new Error(`Failed to toggle filter.`);
  }
};
