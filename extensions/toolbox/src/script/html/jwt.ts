import { Script } from "../type";

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

    const header = Buffer.from(jwtParts[0], "base64").toString("utf8");
    const payload = Buffer.from(jwtParts[1], "base64").toString("utf8");
    const signature = jwtParts[2];

    try {
      const fullJson = {
        header: JSON.parse(header),
        payload: JSON.parse(payload),
        signature: signature,
      };

      // Prettyprint the JSOM
      return JSON.stringify(fullJson, null, 2);
    } catch (err) {
      throw Error("Error while parsing JSON");
    }
  },
};
