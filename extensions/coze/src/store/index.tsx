import { LocalStorage } from "@raycast/api";

export const getUserId = async (): Promise<string> => {
  const USER_ID_KEY = "user_id";

  try {
    const userId = await LocalStorage.getItem(USER_ID_KEY);
    if (userId) {
      return userId as string;
    }
  } catch (error) {
    console.error("getUserId failed", error);
  }

  const randomUserId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  await LocalStorage.setItem(USER_ID_KEY, randomUserId);
  return randomUserId;
};
