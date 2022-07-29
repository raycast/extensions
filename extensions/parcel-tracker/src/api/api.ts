import axios from "axios";

const instance = axios.create({ timeout: 10000 });

instance.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    return Promise.reject(error);
  }
);

const apiServer = "http://parcel-tracker.mooo.com:18000/api";

export const getVendors = () => {
  return instance.get(`${apiServer}/vendors`);
};

export const getVendorByCode = (code: string) => {
  return instance.get(`${apiServer}/vendor/${encodeURIComponent(code)}`);
};

export const getTrackData = (vendorId: string, trackId: string) => {
  return instance.get(
    `${apiServer}/tracking?vendorId=${encodeURIComponent(vendorId)}&invoiceNumber=${encodeURIComponent(trackId)}`
  );
};
