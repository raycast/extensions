import { transformer } from "../helpers";
import { Util } from "../interfaces";

const base64Decode: Util = {
  name: "Base64 decode",
  icon: "base64_icon.png",
  description: "Descodes text from Base64",
  inputType: "textarea",
  transform: transformer((s: string) => {
    return Buffer.from(s, "base64").toString("utf-8");
  }),
};

export default base64Decode;
