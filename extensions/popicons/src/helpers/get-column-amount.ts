import { exhaustive } from "./exhaustive";

function getColumnAmount(size: "small" | "medium" | "large"): number {
  switch (size) {
    case "small":
      return 8;
    case "medium":
      return 7;
    case "large":
      return 6;
    default:
      return exhaustive(size, `Unknown size "${size}"`);
  }
}

export { getColumnAmount };
