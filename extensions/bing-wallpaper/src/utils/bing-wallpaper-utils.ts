export const buildBingWallpapersURL = (wallpaperDate = 0, count = 8) => {
  return `https://www.bing.com/HPImageArchive.aspx?format=js&idx=${wallpaperDate}&n=${count}&pid=hp&uhd=1&uhdwidth=3840&uhdheight=2160`;
};

export const buildBingImageURL = (urlSuffix: string, downloadSize = "full", high = 3840, width = 2160) => {
  let _urlSuffix;
  switch (downloadSize) {
    case "raw": {
      _urlSuffix = urlSuffix.replace("&w=3840&h=2160", "");
      break;
    }
    case "full": {
      _urlSuffix = urlSuffix;
      break;
    }
    case "regular": {
      _urlSuffix = urlSuffix.replace("3840", "2560").replace("2160", "1440");
      break;
    }
    case "small": {
      _urlSuffix = urlSuffix.replace("3840", "1920").replace("2160", "1080");
      break;
    }
    default: {
      _urlSuffix = urlSuffix.replace("3840", high + "").replace("2160", width + "");
      break;
    }
  }
  return "https://www.bing.com" + _urlSuffix;
};
export const buildCopyrightURL = (urlSuffix: string) => {
  return "https://www.bing.com" + urlSuffix;
};

export const buildTime = (date: string) => {
  return date.substring(0, 4) + "-" + date.substring(4, 6) + "-" + date.substring(6, 8);
};

export const getCopyright = (copyright: string) => {
  const firstBrackets = copyright.indexOf("(");
  const lastBrackets = copyright.indexOf(")");
  return {
    story: copyright.substring(0, firstBrackets),
    copyright: copyright.substring(firstBrackets + 1, lastBrackets),
  };
};

export const getPictureName = (url: string) => {
  const firstBrackets = 11;
  const lastBrackets = url.indexOf("_");
  return url.substring(firstBrackets, lastBrackets);
};

export interface BingResponseData {
  images: {
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
  }[];
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

export const bingImageInit = {
  startdate: "20220331",
  fullstartdate: "202203310700",
  enddate: "20220401",
  url: "/th?id=OHR.AnniEiffel_ROW3307325015_UHD.jpg&rf=LaDigue_UHD.jpg&pid=hp&w=3840&h=2160&rs=1&c=4",
  urlbase: "/th?id=OHR.AnniEiffel_ROW3307325015",
  copyright: "Eiffel Tower, Paris, France (© Susanne Kremer/eStock Photo)",
  copyrightlink: "/search?q=Eiffel+Tower&form=hpcapt",
  title: "Info",
  quiz: "/search?q=Bing+homepage+quiz&filters=WQOskey:%22HPQuiz_20220331_AnniEiffel%22&FORM=HPQUIZ",
  wp: true,
  hsh: "d8312e30872a5252dd4a19cbb550a23d",
  drk: 1,
  top: 1,
  bot: 1,
  hs: [],
};
