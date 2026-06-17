import axiosClient from "./axios";
export const deleteProfile = async (id: string | number) => {
  const res = await axiosClient.delete(`/profiles/${id}`);

  if (!res.data.success) {
    throw new Error(`Failed to delete profile: ${res.data.error.message}`);
  }

  return res.data.message;
};
