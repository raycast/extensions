import { apiRequest, withCache } from "./api";

export async function getMe(): Promise<{ id: string }> {
  return withCache("me", async () => {
    const {
      data: { id },
    } = await apiRequest({
      endpoint: "me",
    });
    return { id };
  });
}
