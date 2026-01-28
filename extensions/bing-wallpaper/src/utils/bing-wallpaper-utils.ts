export const buildBingWallpapersURL = (wallpaperDate = 0, count = 8) => {
  return `https://www.bing.com/HPImageArchive.aspx?format=js&idx=${wallpaperDate}&n=${count}&pid=hp&uhd=1&uhdwidth=3840&uhdheight=2160`;
};

export const buildBingImageURL = (urlSuffix: string, downloadSize = "raw", high = 3840, width = 2160) => {
  let _urlSuffix;
  switch (downloadSize) {
    case "raw": {
      _urlSuffix = urlSuffix.replace("&w=3840&h=2160&rs=1&c=4", "");
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

export const getPictureName = (url: string) => {
  const firstBrackets = 11;
  const lastBrackets = url.indexOf("_");
  return url.substring(firstBrackets, lastBrackets);
};
