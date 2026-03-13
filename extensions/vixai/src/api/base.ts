import AuthStore from "../auth/store";

const baseURL = "https://api.vixai.tech/v1";

const getURL = (path: string): string => {
  return `${baseURL}${path.startsWith("/") ? "" : "/"}${path}`;
};

type APIResponse<T> = {
  data?: T;
};

class API {
  static async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    const accessToken = await AuthStore.getAccessToken();
    if (accessToken) {
      options = options || {};
      options.headers = (options.headers || {}) as Record<string, string>;
      if (!options.headers["Authorization"]) {
        options.headers["Authorization"] = `Bearer ${accessToken}`;
      }
    }
    const response = await fetch(url, options);
    const resJSON = (await response.json()) as APIResponse<T>;
    if (!resJSON.data) {
      throw new Error("error while fetching data");
    }

    return resJSON.data;
  }

  static async get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.fetch<T>(getURL(path), options);
  }

  static async post<T>(path: string, body: Record<string, unknown>, options?: RequestInit): Promise<T> {
    options = options || {};
    options.method = "POST";
    options.headers = (options.headers || {}) as Record<string, string>;
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
    return this.fetch<T>(getURL(path), options);
  }
}

export default API;
