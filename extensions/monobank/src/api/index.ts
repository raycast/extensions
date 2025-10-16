import axios from "axios";

const api = axios.create({
  baseURL: "https://api.monobank.ua",
});

export default api;
