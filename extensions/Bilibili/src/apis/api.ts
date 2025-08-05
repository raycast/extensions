const BASE_PASSPORT_URL = "https://passport.bilibili.com";
const BASE_API_URL = "https://api.bilibili.com";

export const API = {
  gennerateQRCode: () => `${BASE_PASSPORT_URL}/x/passport-login/web/qrcode/generate`,
  checkQRCodeStatus: () => `${BASE_PASSPORT_URL}/x/passport-login/web/qrcode/poll`,
  logout: () => `${BASE_PASSPORT_URL}/login/exit/v2`,
  dynamicFeedAll: (page: number, timeZone: number) =>
    `${BASE_API_URL}/x/polymer/web-dynamic/v1/feed/all?timezone_offset=${timeZone}&type=all&page=${page}`,
  popularVideos: (pn: number, ps: number) => `${BASE_API_URL}/x/web-interface/popular?pn=${pn}&ps=${ps}`,
  rcmdVideos: (fresh_idx_1h: number, fetch_row: number, fresh_idx: number, brush: number) =>
    `${BASE_API_URL}/x/web-interface/index/top/feed/rcmd?y_num=5&fresh_type=4&feed_version=V9&fetch_row=${fetch_row}&fresh_idx=${fresh_idx}&fresh_idx_1h=${fresh_idx_1h}&brush=${brush}&homepage_ver=1&ps=20`,
  popularSeriesList: () => `${BASE_API_URL}/x/web-interface/popular/series/list`,
  popularSeriesVideos: (number: number) => `${BASE_API_URL}/x/web-interface/popular/series/one?number=${number}`,
  videoInfo: (id: string) => `${BASE_API_URL}/x/web-interface/view?aid=${id}`,
  playUrl: (bvid: string, cid: string) =>
    `${BASE_API_URL}/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=112&fnval=0&fnver=0&fourk=1`,
  bvidGetCid: (bvid: string) => `${BASE_API_URL}/x/player/pagelist?bvid=${bvid}`,
  conclusion: () => `${BASE_API_URL}/x/web-interface/view/conclusion/get`,
  heartbeat: () => `${BASE_API_URL}/x/click-interface/web/heartbeat`,
  searchVideos: () => `${BASE_API_URL}/x/web-interface/search/all/v2`,
};
