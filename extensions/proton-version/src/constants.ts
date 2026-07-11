import { ProtonProduct } from "./interface";

export const protonProductsPath = "proton-products";

export const PROTON_MAIL_NAME = "Proton Mail";
export const PROTON_DRIVE_NAME = "Proton Drive";
export const PROTON_ACCOUNT_NAME = "Proton Account";
export const PROTON_CALENDAR_NAME = "Proton Calendar";

const VERSION_LOCATION = "/assets/version.json";

export const PROTON_MAIL_HOME = "https://mail.proton.me";
export const PROTON_DRIVE_HOME = "https://drive.proton.me";
export const PROTON_ACCOUNT_HOME = "https://account.proton.me";
export const PROTON_CALENDAR_HOME = "https://calendar.proton.me";

export const PROTON_MAIL_URL = `${PROTON_MAIL_HOME}${VERSION_LOCATION}`;
export const PROTON_DRIVE_URL = `${PROTON_DRIVE_HOME}${VERSION_LOCATION}`;
export const PROTON_ACCOUNT_URL = `${PROTON_ACCOUNT_HOME}${VERSION_LOCATION}`;
export const PROTON_CALENDAR_URL = `${PROTON_CALENDAR_HOME}${VERSION_LOCATION}`;

export const PROTON_BETA_HEADERS = {
  headers: {
    cookie: "Tag=beta",
  },
};

export const GITHUB_HOME = "https://github.com/ProtonMail/WebClients";

export const PROTON_GITHUB_RELEASE_TAG = (product: ProtonProduct, tag: string) =>
  `https://github.com/ProtonMail/WebClients/releases/tag/${
    encodeURIComponent(product) + encodeURIComponent("@") + encodeURIComponent(tag)
  }`;

export const PROTON_GITHUB_RELEASE_CHANGE = (product: ProtonProduct, tag: string) =>
  `https://github.com/ProtonMail/WebClients/compare/${
    encodeURIComponent(product) + encodeURIComponent("@") + encodeURIComponent(tag)
  }...main`;
