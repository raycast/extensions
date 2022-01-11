import { TransformError } from "./errors";

const transformer = (thunk: (s: string) => string | Promise<string>) => {
  return (s: string) => {
    try {
      return thunk(s);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      if (!e) {
        return "";
      }
      if (typeof e === "string") {
        throw new TransformError(e);
      }
      if (typeof e === "object" && "message" in e) {
        throw new TransformError(e.message, e);
      }
      return "";
    }
  };
};

export { transformer };
