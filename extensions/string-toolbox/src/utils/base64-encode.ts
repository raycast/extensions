import { transformer } from "../helpers";
import { Util } from "../interfaces";

const base64Encode: Util = {
  name: "Base64 encode",
  icon: "base64_icon.png",
  description: "Encodes text to Base64",
  inputType: "textarea",
  transform: transformer((s: string) => {
    return Buffer.from(s, "utf-8").toString("base64");
  }),
};

export default base64Encode;
