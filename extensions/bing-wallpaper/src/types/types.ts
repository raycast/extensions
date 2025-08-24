export interface BingResponseData {
  images: BingImage[];
  tooltips: {
    loading: string;
    previous: string;
    next: string;
    walle: string;
    walls: string;
  };
}

export interface BingImage {
  startdate: string;
  fullstartdate: string;
  enddate: string;
  url: string;
  urlbase: string;
  copyright: string;
  copyrightlink: string;
  title: string;
  quiz: string;
  wp: boolean;
  hsh: string;
  drk: number;
  top: number;
  bot: number;
  hs: undefined[];
}

export interface DownloadedBingImage {
  name: string;
  path: string;
}
