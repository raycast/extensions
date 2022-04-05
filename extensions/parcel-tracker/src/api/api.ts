import axios from "axios";

const instance = axios.create({
  timeout: 10000,
});

instance.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    return Promise.reject(error);
  }
);

// const apiServer = "http://192.168.219.110:18000/api";
const apiServer = "http://localhost:8000/api";

export const getVendors = () => {
  return instance.get(`${apiServer}/vendors`);
};

export const getVendorByCode = (code: string) => {
  return instance.get(`${apiServer}/vendor/${code}`);
};

export const getTrackData = (vendorId: string, trackId: string) => {
  return instance.get(`${apiServer}/tracking?vendorId=${vendorId}&invoiceNumber=${trackId}`);
};
