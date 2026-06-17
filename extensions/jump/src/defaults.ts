import { LocalStorage } from "@raycast/api";
import * as os from "os";

export function installDefaultWeights() {
  // Prepropulates jump tracking data with common destinations
  return Promise.all([
    LocalStorage.setItem("/System/Applications/Calendar.app", 1.05),
    LocalStorage.setItem("/System/Applications/Calculator.app", 1.05),
    LocalStorage.setItem("/System/Applications/Notes.app", 1.05),
    LocalStorage.setItem("/System/Applications/Mail.app", 1.05),
    LocalStorage.setItem("/System/Applications/Music.app", 1.05),
    LocalStorage.setItem("/System/Applications/Photos.app", 1.05),
    LocalStorage.setItem("/System/Volumes/Preboot/Cryptexes/App/System/Applications/Safari.app", 1.05),
    LocalStorage.setItem("/System/Applications/Podcasts.app", 1.05),
    LocalStorage.setItem("/System/Applications/App Store.app", 1.05),
    LocalStorage.setItem("/System/Applications/Books.app", 1.05),
    LocalStorage.setItem("/System/Applications/Clock.app", 1.05),
    LocalStorage.setItem("/System/Applications/Books.app", 1.05),
    LocalStorage.setItem("/System/Applications/FaceTime.app", 1.05),
    LocalStorage.setItem("/System/Applications/Messages.app", 1.05),
    LocalStorage.setItem("/System/Applications/News.app", 1.05),
    LocalStorage.setItem("/System/Applications/Siri.app", 1.05),
    LocalStorage.setItem("/System/Applications/System Preferences.app", 1.05),
    LocalStorage.setItem("/System/Applications/System Settings.app", 1.05),
    LocalStorage.setItem("/System/Applications/TV.app", 1.05),
    LocalStorage.setItem("/System/Applications/TextEdit.app", 1.05),
    LocalStorage.setItem("/System/Applications/Stickies.app", 1.05),
    LocalStorage.setItem("/System/Applications/Weather.app", 1.05),
    LocalStorage.setItem("/System/Applications/Maps.app", 1.05),
    LocalStorage.setItem("/System/Applications/Utilities/Terminal.app", 1.05),

    LocalStorage.setItem(`${os.homedir()}/Desktop/`, 1.1),
    LocalStorage.setItem(`${os.homedir()}/Downloads/`, 1.1),
    LocalStorage.setItem(`${os.homedir()}/Applications/`, 1.1),
    LocalStorage.setItem(`${os.homedir()}/Documents/`, 1.1),
    LocalStorage.setItem(`${os.homedir()}/.Trash/`, 1.1),

    LocalStorage.setItem("https://google.com", 1.5),
    LocalStorage.setItem("https://bing.com", 1.5),
    LocalStorage.setItem("https://stackoverflow.com", 1.5),
    LocalStorage.setItem("https://duckduckgo.com", 1.2),
    LocalStorage.setItem("https://wolframalpha.com", 1.2),
    LocalStorage.setItem("https://chat.openai.com", 1.06),
    LocalStorage.setItem("https://yahoo.com", 1.1),

    LocalStorage.setItem("https://youtube.com", 1.2),
    LocalStorage.setItem("https://vimeo.com", 1.05),
    LocalStorage.setItem("https://www.disneyplus.com", 1.05),
    LocalStorage.setItem("https://www.paramountplus.com", 1.05),
    LocalStorage.setItem("https://www.netflix.com", 1.05),

    LocalStorage.setItem("https://calendar.google.com", 1.03),
    LocalStorage.setItem("https://mail.google.com", 1.05),
    LocalStorage.setItem("https://drive.google.com", 1.05),

    LocalStorage.setItem("https://reddit.com", 1.05),
    LocalStorage.setItem("https://facebook.com", 1.05),
    LocalStorage.setItem("https://twitter.com", 1.05),

    LocalStorage.setItem("https://apple.com", 1.05),
    LocalStorage.setItem("https://microsoft.com", 1.05),
    LocalStorage.setItem("https://amazon.com", 1.05),
    LocalStorage.setItem("https://ebay.com", 1.05),
    LocalStorage.setItem("https://etsy.com", 1.05),
  ]);
}
