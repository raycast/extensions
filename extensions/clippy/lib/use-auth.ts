import { useCachedPromise } from "@raycast/utils";
import { authorize } from "./oauth";
import { API_URL } from "./api-url";

export function useAuth() {
  const { data, error, isLoading, revalidate } = useCachedPromise(async () => {
    const token = await authorize();
    
    // Fetch user data using the token
    const response = await fetch(`${API_URL}/api/user/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch user data");
    }
    
    const userData = await response.json();
    
    return userData;
  });

  return { data, error, isLoading, revalidate };
}
