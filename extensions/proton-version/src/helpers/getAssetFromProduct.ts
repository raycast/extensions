import { protonProductsPath } from "../constants";
import { ProtonProduct } from "../interface";

export const getAssetFromProduct = (product: ProtonProduct) => {
  switch (product) {
    case "Proton Mail":
      return `${protonProductsPath}/ProtonMail.png`;
    case "Proton Drive":
      return `${protonProductsPath}/ProtonDrive.png`;
    case "Proton Calendar":
      return `${protonProductsPath}/ProtonCalendar.png`;
    case "Proton Account":
      return `${protonProductsPath}/Proton.png`;
  }
};
