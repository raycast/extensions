import { getApiKey } from "./key";
import { getApiUrl, getHeaders } from "../config";
import { InvalidApiKeyError } from "./invalid-key";

export const toggleAlias = async (email: string, newState: boolean) => {
  const headers = getHeaders(getApiKey());

  let res: Response;

  if (!newState) {
    res = await fetch(`${getApiUrl()}/delete-aliases`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({
        email,
      }),
    });
  } else {
    res = await fetch(`${getApiUrl()}/active-aliases`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
      }),
    });
  }

  if (res.status === 401) {
    throw new InvalidApiKeyError();
  }

  return res.status === (newState ? 200 : 204);
};
