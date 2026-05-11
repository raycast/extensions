import { ProtonProduct } from "./interface";

export const PRODUCT_TITLE: Record<ProtonProduct, string> = {
  "proton-mail": "Proton Mail",
  "proton-calendar": "Proton Calendar",
  "proton-drive": "Proton Drive",
  "proton-account": "Proton Account",
};

export const PRODUCT_ICON: Record<ProtonProduct, string> = {
  "proton-mail": "proton-products/ProtonMail.png",
  "proton-calendar": "proton-products/ProtonCalendar.png",
  "proton-drive": "proton-products/ProtonDrive.png",
  "proton-account": "proton-products/Proton.png",
};

export const PRODUCT_KEYWORDS: Record<ProtonProduct, string[]> = {
  "proton-mail": ["Mail", "ProtonMail", "Proton Mail"],
  "proton-calendar": ["Calendar", "Proton Calendar"],
  "proton-drive": ["Drive", "Proton Drive"],
  "proton-account": ["Account", "Settings", "Proton Account"],
};

export const PRODUCT_HOME: Record<ProtonProduct, string> = {
  "proton-mail": "https://mail.proton.me",
  "proton-calendar": "https://calendar.proton.me",
  "proton-drive": "https://drive.proton.me",
  "proton-account": "https://account.proton.me",
};
