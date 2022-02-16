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

export const getSearchPage = () => {
  return instance.get(
    "https://m.search.naver.com/search.naver?sm=tab_hty.top&where=nexearch&query=%ED%83%9D%EB%B0%B0%EC%A1%B0%ED%9A%8C"
  );
};

export const getTrackData = (vendorId: string, trackId: string, passportKey: string) => {
  return instance.get(
    `https://m.search.naver.com/p/csearch/ocontent/util/headerjson.naver?callapi=parceltracking&t_code=${vendorId}&t_invoice=${trackId}&passportKey=${passportKey}`
  );
};
