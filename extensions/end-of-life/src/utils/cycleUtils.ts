import { EndOfLifeProductDetails } from "../types";
import isValidDate from "./isValidDate";

const isEOL = (cycle: EndOfLifeProductDetails): boolean => {
  if (!Object.hasOwn(cycle, "eol")) {
    return false;
  }
  const value = cycle.eol;
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (isValidDate(value)) {
      return new Date(value) < new Date();
    }
  }
  return false;
};

const isLTS = (cycle: EndOfLifeProductDetails): boolean => {
  if (!Object.hasOwn(cycle, "lts")) {
    return false;
  }
  const value = cycle.lts;
  if (typeof value === "boolean") {
    return value && !isEOL(cycle);
  }
  if (typeof value === "string") {
    if (isValidDate(value)) {
      if (!isEOL(cycle)) {
        return true;
      }
    }
  }
  return false;
};

export { isEOL, isLTS };
