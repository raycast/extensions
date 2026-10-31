import { Icon } from "@raycast/api";
import { decodeJwt } from "./utils/toolbox";
import { InputForm } from "./components/InputForm";
import { ResultRow } from "./components/ResultList";

export default function Command() {
  return (
    <InputForm
      inputTitle="JWT Token"
      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature"
      compute={(values) => {
        const input = (values.input ?? "").trim();
        if (!input) return [];
        try {
          const jwt = decodeJwt(input);
          const rows: ResultRow[] = [
            {
              id: "header",
              title: JSON.stringify(jwt.header),
              subtitle: "Header",
              detail: JSON.stringify(jwt.header, null, 2),
              icon: Icon.Code,
            },
            {
              id: "payload",
              title: JSON.stringify(jwt.payload),
              subtitle: "Payload",
              detail: JSON.stringify(jwt.payload, null, 2),
              icon: Icon.Document,
            },
            {
              id: "signature",
              title: jwt.signature || "(no signature)",
              subtitle: "Signature",
              icon: Icon.Key,
            },
          ];
          if (jwt.expiresAt) {
            rows.push({
              id: "exp",
              title: jwt.expiresAt.toISOString(),
              subtitle: `Expires · ${jwt.expired ? "expired" : "valid"}`,
              icon: jwt.expired ? Icon.CircleDisabled : Icon.CheckCircle,
            });
          }
          if (jwt.issuedAt) {
            rows.push({ id: "iat", title: jwt.issuedAt.toISOString(), subtitle: "Issued At", icon: Icon.Clock });
          }
          if (jwt.notBefore) {
            rows.push({ id: "nbf", title: jwt.notBefore.toISOString(), subtitle: "Not Before", icon: Icon.Clock });
          }
          rows.push({
            id: "status",
            title:
              jwt.expired === null ? "No expiry claim" : jwt.expired ? "Token has expired" : "Token is still valid",
            subtitle: "Validity (decoded only — the signature is not verified)",
            icon: Icon.CircleDisabled,
          });
          return rows;
        } catch (error) {
          return [
            {
              id: "error",
              title: "Failed to decode",
              detail: (error as Error).message,
              icon: Icon.CircleDisabled,
              copyValue: (error as Error).message,
            },
          ];
        }
      }}
    />
  );
}
