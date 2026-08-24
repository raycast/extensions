import { TargetprocessError } from "./types";

export interface FailureCopy {
  title: string;
  message: string;
}

export function describeFailure(error: unknown, instanceLabel?: string): FailureCopy {
  const where = instanceLabel ? ` ${instanceLabel}` : " Targetprocess";

  if (!(error instanceof TargetprocessError)) {
    return {
      title: "Something Went Wrong",
      message: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }

  switch (error.kind) {
    case "unreachable":
      return {
        title: `Couldn't Reach${where}`,
        message: "Check the address, your connection, and any VPN this instance needs.",
      };
    case "unauthorised":
      return {
        title: "Authentication Failed",
        message: "Targetprocess rejected the token. It may have been revoked, or it may have expired.",
      };
    case "not-targetprocess":
      return { title: "Not a Targetprocess Instance", message: error.message };
    case "rate-limited":
      return {
        title: "Too Many Requests",
        message: "Targetprocess is throttling this token. It will recover on its own in a moment.",
      };
    case "not-found":
      return { title: "Not Found", message: error.message };
    case "server":
      return { title: "Targetprocess Error", message: error.message };
    default:
      return { title: "Something Went Wrong", message: error.message };
  }
}
