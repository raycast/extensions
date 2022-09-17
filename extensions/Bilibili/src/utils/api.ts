export const API = {
  gennerateQRCode: () => "http://passport.bilibili.com/x/passport-login/web/qrcode/generate",
  checkQRCodeStatus: () => "http://passport.bilibili.com/x/passport-login/web/qrcode/poll",
  logout: () => "http://passport.bilibili.com/login/exit/v2",
  dynamicFeedAll: (page: number, timeZone: number) =>
    `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all?timezone_offset=${timeZone}&type=all&page=${page}`,
  popularVideos: (pn: number, ps: number) => `https://api.bilibili.com/x/web-interface/popular?pn=${pn}&ps=${ps}`,
  rcmdVideos: (fresh_idx_1h: number, fetch_row: number, fresh_idx: number, brush: number) =>
    `https://api.bilibili.com/x/web-interface/index/top/feed/rcmd?y_num=5&fresh_type=4&feed_version=V9&fetch_row=${fetch_row}&fresh_idx=${fresh_idx}&fresh_idx_1h=${fresh_idx_1h}&brush=${brush}&homepage_ver=1&ps=20`,
  popularSeriesList: () => "https://api.bilibili.com/x/web-interface/popular/series/list",
  popularSeriesVideos: (number: number) =>
    `https://api.bilibili.com/x/web-interface/popular/series/one?number=${number}`,
};
