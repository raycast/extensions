import { Script } from "../type";

export const numberRandom: Script = {
  info: {
    title: "Random Number",
    desc: "Random Number in range",
    type: ["list", "form"],
    example: "1,100",
  },
  run(input) {
    const minMax = input.split(",").map(Number);
    const result = Math.floor(Math.random() * (minMax[1] - minMax[0] + 1) + minMax[0]);
    if (isFinite(result)) {
      return String(result);
    } else {
      throw Error("Invalid Number");
    }
  },
};
