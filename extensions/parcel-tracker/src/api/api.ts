import axios from "axios";

const apiServer = "https://api.delivery-tracker.kr/api";
const apiKey = "e6ca43b303f454c467cf96790808049d82a5b31350ba77af1a6ee33c6d795423";
const instance = axios.create({
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
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

export const getVendors = () => {
  return instance.get(`${apiServer}/vendors`);
};

export const getVendorByCode = (code: string) => {
  console.log("code", code);
  return instance.get(`${apiServer}/vendor/${encodeURIComponent(code)}`);
};

export const getTrackData = (vendorCode: string, invoiceNo: string) => {
  return instance.get(
    `${apiServer}/tracking?vendorCode=${encodeURIComponent(vendorCode)}&invoiceNo=${encodeURIComponent(invoiceNo)}`
  );
};
