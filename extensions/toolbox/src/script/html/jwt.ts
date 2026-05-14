import { Script } from "../type";
import { decode } from "js-base64";

export const jwt: Script = {
  info: {
    title: "JWT Decode",
    desc: "Converts JWTs to JSON",
    type: ["form", "clipboard"],
    example:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiUmF5Y2FzdCIsImlhdCI6MTUxNjIzOTAyMn0.Rq2-jOY190cFnTIsitqqY_FHLUV11fpXHGgw-ENbn9o",
  },
  run(input) {
    const t = input;
    const jwtParts = t.split(".");
    if (jwtParts.length != 3) {
      throw Error("Invalid Token");
    }

    const header = decode(jwtParts[0]);
    const payload = decode(jwtParts[1]);
    const signature = jwtParts[2];

    try {
      const fullJson = {
        header: JSON.parse(header),
        payload: JSON.parse(payload),
        signature: signature,
      };

      // Prettyprint the JSON
      return JSON.stringify(fullJson, null, 2);
    } catch {
      throw Error("Error while parsing JSON");
    }
  },
};
