export const API_RATE_LIMIT = 5;
export const API_URL = "http://127.0.0.1:8000/api/v1";
// export const API_URL = "https://hidemail.app/api/v1";

export const getHeaders = (token: string) => {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Custom-Agent": "Raycast",
  };
};
