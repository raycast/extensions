import { transformer } from "../helpers";
import { Util } from "../interfaces";

const urlEncode: Util = {
  name: "URL Encode",
  icon: "url_icon.png",
  description: "Encodes URL entities",
  inputType: "textfield",
  transform: transformer((s: string) => {
    return encodeURIComponent(s);
  }),
};

export default urlEncode;
