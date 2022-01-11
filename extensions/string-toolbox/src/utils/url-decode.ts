import { transformer } from "../helpers";
import { Util } from "../interfaces";

const decodeUrl: Util = {
  name: "URL Decode",
  icon: "url_icon.png",
  description: "Decodes URL entities",
  inputType: "textfield",
  transform: transformer((s: string) => {
    return decodeURIComponent(s);
  }),
};

export default decodeUrl;
