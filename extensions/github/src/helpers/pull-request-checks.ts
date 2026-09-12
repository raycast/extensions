import type { StatusState } from "../generated/graphql";

export type CheckStatePresentation = {
  icon: "Check" | "Xmark" | "Clock";
  text: "Success" | "Failure" | "Pending";
};

export function getCheckStatePresentation(state: StatusState | null | undefined): CheckStatePresentation | null {
  switch (state) {
    case "SUCCESS":
      return { icon: "Check", text: "Success" };
    case "ERROR":
    case "FAILURE":
      return { icon: "Xmark", text: "Failure" };
    case "PENDING":
      return { icon: "Clock", text: "Pending" };
    default:
      return null;
  }
}
