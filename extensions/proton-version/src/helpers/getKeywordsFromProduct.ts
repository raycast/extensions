import { ProtonProduct } from "../interface";

export const getKeywordsFromProduct = (product: ProtonProduct) => {
  switch (product) {
    case "Proton Mail":
      return ["Mail", "ProtonMail", "Proton Mail"];
    case "Proton Drive":
      return ["Drive", "Proton Drive"];
    case "Proton Calendar":
      return ["Calendar", "Proton Calendar"];
    case "Proton Account":
      return ["Account", "Settings", "Proton Account"];
  }
};
