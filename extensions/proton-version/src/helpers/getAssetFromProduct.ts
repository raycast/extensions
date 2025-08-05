import { protonProductsPath } from "../constants";
import { ProtonProduct } from "../interface";

export const getAssetFromProduct = (product: ProtonProduct) => {
  switch (product) {
    case "proton-mail":
      return `${protonProductsPath}/ProtonMail.png`;
    case "proton-drive":
      return `${protonProductsPath}/ProtonDrive.png`;
    case "proton-calendar":
      return `${protonProductsPath}/ProtonCalendar.png`;
    case "proton-account":
      return `${protonProductsPath}/Proton.png`;
  }
};
