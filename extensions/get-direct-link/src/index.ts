import { showHUD, Clipboard } from "@raycast/api";

export default async function main() {
  let clipboard = await Clipboard.readText();
  clipboard = clipboard?.replace(/\s/g, "");
  const findHostname = (host: string) => {
    if (clipboard?.startsWith(host)) {
      return clipboard;
    }
  };
  const doesContain = (_fromString: string, _toSubstring: string) => {
    const symbols = [".", "_", "-"];
    for (let s = 0; s < symbols.length; s++) {
      const splits = _fromString.split(symbols[s]);
      for (let i = 0; i < splits.length; i++) {
        if (splits[i] === _toSubstring) {
          return true;
        }
      }
    }
    return false;
  };

  function isDirectLink(_url: string, _ofHost: string) {
    let reg: RegExp;
    switch (_ofHost) {
      case "google": {
        reg = /^https?:\/\/drive\.google\.com\/uc\?id=[\d\w]+&export=download$/g;
        break;
      }
      case "dropbox": {
        reg = /^https?:\/\/dl\.dropboxusercontent\.com\/s\/[\d\w]+\/[^/\s]+$/g;
        break;
      }
      case "imgur": {
        reg = /^https?:\/\/i\.imgur\.com\/[\d\w]+\.jpeg$/g;
        break;
      }
      default: {
        return false;
      }
    }
    if (_url.replace(reg, "") === "") {
      return true;
    } else {
      return false;
    }
  }

  function getGoogleId(_url: string) {
    let reg: RegExp;
    let isMatched = false;
    switch (true) {
      case _url.startsWith("https://drive.google.com/open"): {
        reg = /(?<=^https?:\/\/drive\.google\.com\/open\?id=)[^&]+/g;
        isMatched = true;
        break;
      }
      case _url.startsWith("https://drive.google.com/file/d/"): {
        reg = /(?<=^https?:\/\/drive\.google\.com\/file\/d\/)[^/]+/g;
        isMatched = true;
        break;
      }
      default: {
        return null;
      }
    }
    if (isMatched) {
      const matches = _url.match(reg);
      if (matches != null) {
        return matches[0];
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  function dropboxParser(_url: string) {
    const UrlMatches = _url.match(/(?<=^https?:\/\/[w.]*dropbox.com\/s\/)[a-z0-9]+\/[\S]+/g);
    if (UrlMatches != null) {
      const [id, file] = UrlMatches[0].replace(/\?dl=0/, "").split("/");
      const dotSplitted = file.split(".");
      let newFile = "";
      switch (
        dotSplitted.length // Check how many . in the file
      ) {
        case 1: {
          // no file extension
          newFile = dotSplitted[0] + "_" + id;
          break;
        }
        default: {
          // more than 1 .
          for (let i = 0; i < dotSplitted.length - 1; i++) {
            newFile += dotSplitted[i];
          }
          // Check is there id in the filename
          if (doesContain(newFile, id)) {
            // name contains id
            newFile += "." + dotSplitted[dotSplitted.length - 1];
          } else {
            // name doesnt contain id
            newFile += "_" + id + "." + dotSplitted[dotSplitted.length - 1];
          }
        }
      }
      return [id, newFile];
    } else {
      return [null, null];
    }
  }

  function getImgurId(_url: string) {
    const reg = /(?<=^https?:\/\/imgur\.com\/)[^/]+$/g;
    const matches = _url.match(reg);
    if (matches != null) {
      return matches[0];
    } else {
      return null;
    }
  }
  switch (clipboard) {
    case findHostname("https://drive.google.com"): {
      // Google Drive
      if (isDirectLink(clipboard!, "google")) {
        await showHUD("It already is a direct link");
        break;
      }
      const ghead = "https://drive.google.com/uc?id=";
      const gtail = "&export=download";
      const gid = getGoogleId(clipboard!);
      if (gid != null) {
        clipboard = ghead + gid + gtail;
        await Clipboard.copy(clipboard);
        await showHUD("🥳 Google Drive direct link was copied to clipboard");
      } else {
        await showHUD("🤷‍♂️ Error 101");
      }
      break;
    }
    case findHostname("https://dl.dropboxusercontent.com"):
    case findHostname("https://www.dl.dropboxusercontent.com"): {
      if (isDirectLink(clipboard!, "dropbox")) {
        await showHUD("😂 It already is a direct link");
      }
      break;
    }
    case findHostname("https://www.dropbox.com/s/"): // Dropbox
    case findHostname("https://dropbox.com/s/"): {
      const [did, file] = dropboxParser(clipboard!);

      if (did! != null) {
        await Clipboard.copy("https://dl.dropboxusercontent.com/s/" + did + "/" + file + "?dl=0");
        await showHUD("🥳 Dropbox direct link was copied to clipboard");
      } else {
        await showHUD("😭 It's not Dropbox's shareable URL");
      }
      break;
    }
    case findHostname("https://i.imgur.com"): {
      // Imgur
      if (isDirectLink(clipboard!, "imgur")) {
        await showHUD("😂 It already is a direct link");
      }
      break;
    }
    case findHostname("https://imgur.com"): {
      // Imgur
      const ihead = "https://i.imgur.com/";
      const itail = ".jpeg";
      const iid = getImgurId(clipboard!);
      if (iid != null) {
        clipboard = ihead + iid + itail;
        await Clipboard.copy(clipboard);
        await showHUD("🥳 Imgur direct link was copied to clipboard");
      } else {
        await showHUD("🤷‍♂️ Error 102");
      }
      break;
    }
    default: {
      await showHUD("😭 Can not find an URL");
      break;
    }
  }
}
