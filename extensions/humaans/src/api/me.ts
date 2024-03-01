import { apiRequest } from "./api";

export async function getMe(): Promise<{ id: string }> {
  const {
    data: { id },
  } = await apiRequest({
    endpoint: "me",
  });
  return { id };
}
