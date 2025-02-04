import axios from "axios";
export const request = async ({ method, data, url }) => {
  // what's options type?
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    data: data && method === "POST" ? JSON.stringify(data) : undefined,
    url: url ? url : "",
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
