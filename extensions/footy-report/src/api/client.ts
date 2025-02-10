import axios from "axios";

const client = (apiKey: string) => {
  return axios.create({
    baseURL: "https://api.sportmonks.com/v3/football",
    headers: { Authorization: apiKey },
  });
};

export default client;
