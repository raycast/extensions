import axios from "axios";

const baseURL = "https://api.brawlstars.com/v1/";

export const AxiosPure = axios.create({ baseURL });
const Axios = axios.create({ baseURL });

Axios.interceptors.request.use((request) => {
  return request;
});

Axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error.message);
  }
);

AxiosPure.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default Axios;
