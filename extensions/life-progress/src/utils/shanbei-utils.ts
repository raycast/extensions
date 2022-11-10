export type ShanBeiResponseData = {
  id: string;
  content: string;
  author: string;
  assign_date: string;
  ad_url: null;
  daily_audio_urls: null;
  poster_img_urls: string[];
  track_object: { code: string; share_url: string; object_id: number };
  join_num: number;
  translation: string;
  share_urls: {
    wechat: string;
    wechat_user: string;
    qzone: string;
    weibo: string;
    shanbay: string;
  };
  origin_img_urls: string[];
  share_url: string;
  share_img_urls: string[];
};

export type WordOfTheDay = {
  content: string;
  author: string;
  translation: string;
};

export const buildShanBayURL = () => {
  const date = new Date();
  const queryDate = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
  return `https://apiv3.shanbay.com/weapps/dailyquote/quote/?date=${queryDate}`;
};
