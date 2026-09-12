import { ReactNode } from "react";
import { ErrorDetail } from "./error-detail";
import { PleaseCopy } from "./please-copy";
import { DecodedJwtState } from "../utils/use-decoded-jwt";

type ReadyDecodedJwt = Extract<DecodedJwtState, { status: "ready" }>;

interface DecodedJwtGateProps {
  decoded: DecodedJwtState;
  children: (decoded: ReadyDecodedJwt) => ReactNode;
}

export function DecodedJwtGate({ decoded, children }: DecodedJwtGateProps) {
  if (decoded.status === "empty") {
    return <PleaseCopy ready={decoded.ready} />;
  }

  if (decoded.status === "error") {
    return <ErrorDetail error={decoded.error} value={decoded.clipboard} />;
  }

  return children(decoded);
}
