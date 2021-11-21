import { Script } from "../type";

export const plus: Script = {
  info: { title: "NumberPlus", desc: "Input Number plus" },
  run(input) {
    try {
      const result = Number(input) * 2;
      if (isFinite(result)) {
        return String(result);
      } else {
        throw Error("No Number");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw Error("error");
      }
    }
  },
};
