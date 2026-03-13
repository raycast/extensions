import axios from "axios";

const request = axios.create({
  baseURL: "https://api.juejin.cn/",
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default request;
