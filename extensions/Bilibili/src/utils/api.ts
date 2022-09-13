export const API = {
  gennerateQRCode: () => "http://passport.bilibili.com/x/passport-login/web/qrcode/generate",
  checkQRCodeStatus: () => "http://passport.bilibili.com/x/passport-login/web/qrcode/poll",
  dynamicFeedAll: (page: number, timeZone: number) =>
    `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all?timezone_offset=${timeZone}&type=all&page=${page}`,
  popularVideos: (pn: number, ps: number) => `https://api.bilibili.com/x/web-interface/popular?pn=${pn}&ps=${ps}`,
};
