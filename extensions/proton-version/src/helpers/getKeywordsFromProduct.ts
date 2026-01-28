import { ProtonProduct } from "../interface";

export const getKeywordsFromProduct = (product: ProtonProduct) => {
  switch (product) {
    case "proton-mail":
      return ["Mail", "ProtonMail", "Proton Mail"];
    case "proton-drive":
      return ["Drive", "Proton Drive"];
    case "proton-calendar":
      return ["Calendar", "Proton Calendar"];
    case "proton-account":
      return ["Account", "Settings", "Proton Account"];
  }
};
