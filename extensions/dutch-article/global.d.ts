// Fix React 18 types compatibility with Raycast API
import type {} from "react";

declare module "react" {
  // Allow bigint and Promise in ReactNode for compatibility with Raycast API
  interface DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_REACT_NODES {}
}
