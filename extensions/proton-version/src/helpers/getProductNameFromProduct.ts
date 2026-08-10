import { PROTON_ACCOUNT_NAME, PROTON_CALENDAR_NAME, PROTON_DRIVE_NAME, PROTON_MAIL_NAME } from "../constants";
import { ProtonProduct } from "../interface";

export const getProductNameFromProduct = (product: ProtonProduct) => {
  switch (product) {
    case "proton-mail":
      return PROTON_MAIL_NAME;
    case "proton-drive":
      return PROTON_DRIVE_NAME;
    case "proton-calendar":
      return PROTON_CALENDAR_NAME;
    case "proton-account":
      return PROTON_ACCOUNT_NAME;
  }
};
