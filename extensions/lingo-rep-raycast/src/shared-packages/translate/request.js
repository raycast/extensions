import axios from "axios";
export const request = async ({ method, data, url }) => {
  if (!url) throw new Error("No URL provided");
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    data: data && method.toUpperCase() === "POST" ? JSON.stringify(data) : undefined,
    url,
  };
  const response = await axios(options);
  return response.data;
};
export const get = async (url) => {
  return request({ method: "get", url });
};
export const post = async (data, url) => {
  return request({ method: "post", data, url });
};
