import { Script } from "../type";

/* export default <Script>{
  info: { title: "Test", desc: "Test" },
  run(input) {
    return input;
  },
}; */

export const Base64Encode: Script = {
  info: { title: "Base64Encode", desc: "Change String to Base64" },
  run(input) {
    return Buffer.from(input, "binary").toString("base64");
  },
};

export const Base64Decode: Script = {
  info: { title: "Base64Decode", desc: "Change Base64 to String" },
  run(input) {
    return Buffer.from(input, "base64").toString("binary");
  },
};
