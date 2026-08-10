import { PROTON_ACCOUNT_HOME, PROTON_CALENDAR_HOME, PROTON_DRIVE_HOME, PROTON_MAIL_HOME } from "../constants";
import { ProtonProduct } from "../interface";

export const getProductUrlFromProduct = (product: ProtonProduct) => {
  switch (product) {
    case "proton-mail":
      return PROTON_MAIL_HOME;
    case "proton-drive":
      return PROTON_DRIVE_HOME;
    case "proton-calendar":
      return PROTON_CALENDAR_HOME;
    case "proton-account":
      return PROTON_ACCOUNT_HOME;
  }
};
