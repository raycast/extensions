import axiosClient from "./axios";

export const modifyProfile = async (id: string, newName: string) => {
  const res = await axiosClient.put(`/profiles/${id}`, {
    name: newName,
  });

  if (!res.data.success) {
    throw new Error(`Failed to modify profile: ${res.data.error.message}`);
  }

  return res.data.message;
};
