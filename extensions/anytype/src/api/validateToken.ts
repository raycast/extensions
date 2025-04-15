import { apiFetch } from "../helpers/api";
import { apiEndpoints } from "../helpers/constants";
import { Space, PaginatedResponse } from "../helpers/schemas";
import { errorConnectionMessage } from "../helpers/constants";

// Validate token by checking if data can be fetched without errors
export async function validateToken(): Promise<boolean> {
  try {
    const { url, method } = apiEndpoints.getSpaces({ offset: 0, limit: 1 });
    await apiFetch<PaginatedResponse<Space>>(url, { method: method });
    return true;
  } catch (error) {
    if (error instanceof Error) {
      return error.message == errorConnectionMessage;
    } else {
      console.error("Unknown error:", error);
      return false;
    }
  }
}
