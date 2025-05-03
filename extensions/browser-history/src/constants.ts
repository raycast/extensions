import { SupportedBrowsers } from "./interfaces";

export const defaultProfilePathChrome = ["Application Support", "Google", "Chrome", "Default", "History"];
export const defaultProfilePathFirefox = ["Application Support", "Firefox", "Profiles"];
export const defaultProfilePathSafari = ["Safari", "History.db"];
export const defaultProfilePathEdge = ["Application Support", "Microsoft Edge", "Default", "History"];
export const defaultProfilePathBrave = ["Application Support", "BraveSoftware", "Brave-Browser", "Default", "History"];
export const defaultProfilePathVivaldi = ["Application Support", "Vivaldi", "Default", "History"];
export const defaultProfilePathArc = ["Application Support", "Arc", "User Data", "Default", "History"];
export const defaultProfilePathOpera = ["Application Support", "com.operasoftware.Opera", "History"];
export const defaultProfilePathIridium = ["Application Support", "Iridium", "Default", "History"];
export const defaultProfilePathOrion = ["Application Support", "Orion", "Defaults", "history"];
export const defaultProfilePathSidekick = ["Application Support", "Sidekick", "Default", "History"];

const DownloadTextChrome = `
  # 🚨Error: Google Chrome browser is not installed
  ## This extension depends on Google Chrome browser. You must install it to continue.
  
  If you have [Homebrew](https://brew.sh/) installed then press ⏎ (Enter Key) to install Google Chrome browser.
  
  [Click here](https://www.google.com/chrome/) if you want to download manually.
  
  [![Google Chrome](https://www.google.com/chrome/static/images/chrome-logo-m100.svg)]()
`;

const DownloadTextFirefox = `
  # 🚨Error: Mozilla Firefox browser is not installed
  ## This extension depends on Mozilla Firefox browser. You must install it to continue.
  
  If you have [Homebrew](https://brew.sh/) installed then press ⏎ (Enter Key) to install Mozilla Firefox browser.
  [Click here](https://www.mozilla.org/en-US/firefox/new/) if you want to download manually.
  
  [![Mozilla Firefox](https://mozilla.design/files/2019/10/logo-firefox.svg)]()
`;

const DownloadTextSafari = `
# 🚨Error: Safari browser is not installed
## This extension depends on Brave browser. You must install it to continue.
  
[Click here](https://support.apple.com/downloads/safari) if you want to download manually.
  
[![Safari](https://km.support.apple.com/kb/image.jsp?productid=PL165&size=240x240)]()
`;

const DownloadTextEdge = `
# 🚨Error: Edge browser is not installed
## This extension depends on Brave browser. You must install it to continue.
  
[Click here](https://www.microsoft.com/en-us/edge/download?form=MA13FJ) if you want to download manually.
  
[![Edge](https://edgefrecdn.azureedge.net/shared/edgeweb/img/edge-icon.eaf0232.png)]()
`;

const DownloadTextBrave = `
# 🚨Error: Brave browser is not installed
## This extension depends on Brave browser. You must install it to continue.
  
If you have [Homebrew](https://brew.sh/) installed then press ⏎ (Enter Key) to install Brave browser.

[Click here](https://brave.com/download/) if you want to download manually.
  
[![Brave](https://brave.com/static-assets/images/brave-logo.svg)]()
`;

const DownloadTextVivaldi = `
# 🚨Error: Vivaldi browser is not installed
## This extension depends on Vivaldi browser. You must install it to continue.
  
If you have [Homebrew](https://brew.sh/) installed then press ⏎ (Enter Key) to install Vivaldi browser.

[Click here](https://vivaldi.com/download/) if you want to download manually.
  
[![Vivaldi](https://vivaldi.com/wp-content/themes/vivaldicom-theme/img/press/logos/vivaldi_logo_dark.png)]()
`;

const DownloadTextOpera = `
# 🚨Error: Opera browser is not installed
## This extension depends on Opera browser. You must install it to continue.
  
[Click here](https://opera.com/download/) to download manually.
  
[![Opera](https://www-static-sites.operacdn.com/wp-content/uploads/sites/6/2022/02/Opera-Desktop-Cover-1.png)]()
`;

const DownloadTextArc = `
# 🚨Error: Arc browser is not installed
## This extension depends on Opera browser. You must install it to continue.
`;

const DownloadTextIridium = `
  # 🚨Error: Iridium browser is not installed
  ## This extension depends on Iridium browser. You must install it to continue.
  
  [Click here](https://iridiumbrowser.de/downloads) if you want to download manually.
  
  [![Iridium](https://iridiumbrowser.de/assets/images/logos/iridium-logo_large.svg)]()
`;

const DownloadTextOrion = `
  # 🚨Error: Orion browser is not installed
  ## This extension depends on Orion browser. You must install it to continue.
  
  [Click here](https://browser.kagi.com/) if you want to download manually.
  
  [![Orion](https://browser.kagi.com/public/images/orion-circle.png)]()
`;

const DownloadTextSidekick = `
  # 🚨Error: Sidekick browser is not installed
  ## This extension depends on Sidekick browser. You must install it to continue.
  
  [Click here](https://www.meetsidekick.com/download/) if you want to download manually.
  
  [![Sidekick](https://www.meetsidekick.com/wp-content/themes/sidekick-ppl/assets/img/logo-with-title.svg)]()
`;

export const DOWNLOAD_TEXT = {
  [SupportedBrowsers.Chrome]: DownloadTextChrome,
  [SupportedBrowsers.Firefox]: DownloadTextFirefox,
  [SupportedBrowsers.Safari]: DownloadTextSafari,
  [SupportedBrowsers.Edge]: DownloadTextEdge,
  [SupportedBrowsers.Brave]: DownloadTextBrave,
  [SupportedBrowsers.Vivaldi]: DownloadTextVivaldi,
  [SupportedBrowsers.Arc]: DownloadTextArc,
  [SupportedBrowsers.Opera]: DownloadTextOpera,
  [SupportedBrowsers.Iridium]: DownloadTextIridium,
  [SupportedBrowsers.Orion]: DownloadTextOrion,
  [SupportedBrowsers.Sidekick]: DownloadTextSidekick,
};

export const INSTALL_COMMAND = {
  [SupportedBrowsers.Chrome]: "brew cask install google-chrome",
  [SupportedBrowsers.Firefox]: "brew cask install firefox",
  [SupportedBrowsers.Safari]: undefined,
  [SupportedBrowsers.Edge]: "brew cask install microsoft-edge",
  [SupportedBrowsers.Brave]: "brew cask install brave-browser",
  [SupportedBrowsers.Vivaldi]: "brew cask install vivaldi",
  [SupportedBrowsers.Arc]: undefined,
  [SupportedBrowsers.Opera]: "brew cask install opera",
  [SupportedBrowsers.Iridium]: undefined,
  [SupportedBrowsers.Orion]: "brew cask install opera",
  [SupportedBrowsers.Sidekick]: "brew install --cask pushplaylabs-sidekick",
};

export const UnknownErrorText = `
  # 🚨Error: Something happened while trying to run your command
`;

export const DEFAULT_ERROR_TITLE = "An Error Occurred";

export const NOT_INSTALLED_MESSAGE = "Browser not installed";
