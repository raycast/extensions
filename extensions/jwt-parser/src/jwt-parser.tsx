import {
  Form,
  ActionPanel,
  Action,
  useNavigation,
  Clipboard,
  showToast,
  Toast,
  Detail,
  Icon,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getTokenDetails, isJWT } from "./utils";
import { TokenDetails } from "./types";
import { JwtPayload } from "jsonwebtoken";
import { showFailureToast } from "@raycast/utils/dist/showFailureToast";

interface FormValues {
  token: string;
  secret?: string;
}

function TokenView(props: { token: string; details: TokenDetails }) {
  const { token, details } = props;
  const { header, payload, validation } = details;

  // Format payload values for display, removing quotes and formatting dates
  const formatPayloadValue = (key: string, value: JwtPayload[keyof JwtPayload]): string => {
    // Handle dates
    if (typeof value === "number" && (key === "exp" || key === "iat" || key === "nbf")) {
      return new Date(value * 1000).toLocaleString();
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    // Handle objects
    if (typeof value === "object" && value !== null) {
      // Convert to string but remove outer quotes
      const jsonStr = JSON.stringify(value, null, 2);
      return jsonStr;
    }

    // Handle primitives (string, number, boolean)
    return String(value);
  };

  // Create a better-organized markdown table structure
  const markdown = `
# JWT Token Details

## Overview

| Section | Status |
|---------|--------|
| Header | \`${header.alg}\` algorithm |
| Payload | ${Object.keys(payload).length} claims |
| Validation | ${validation ? (validation.isValid ? "✅ Valid" : "❌ Invalid") : "⚠️ Not Validated"} |

## Header
\`\`\`json
${JSON.stringify(header, null, 2)}
\`\`\`

## Payload Claims

| Claim | Value | Description |
|-------|-------|-------------|
${Object.entries(payload)
  .map(([key, value]) => {
    let description = "";
    // Add descriptions for standard claims
    if (key === "exp") description = "Expiration time";
    else if (key === "iat") description = "Issued at time";
    else if (key === "nbf") description = "Not valid before time";
    else if (key === "sub") description = "Subject";
    else if (key === "iss") description = "Issuer";
    else if (key === "aud") description = "Audience";
    else if (key === "jti") description = "JWT ID";

    return `| \`${key}\` | ${formatPayloadValue(key, value)} | ${description} |`;
  })
  .join("\n")}

${
  validation
    ? `
## Validation Details

| Property | Value |
|----------|-------|
| Status | ${validation.isValid ? "✅ Valid" : "❌ Invalid"} |
${validation.error ? `| Error | ${validation.error} |` : ""}
`
    : ""
}

## Raw Token
\`\`\`
${token.slice(0, token.lastIndexOf(".") + 1)}
${token.slice(token.lastIndexOf(".") + 1)}
\`\`\`
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            {validation ? (
              <Detail.Metadata.TagList.Item
                text={validation.isValid ? "Valid" : "Invalid"}
                color={validation.isValid ? Color.Green : Color.Red}
                icon={validation.isValid ? Icon.CheckCircle : Icon.XMarkCircle}
              />
            ) : (
              <Detail.Metadata.TagList.Item text="Not Validated" color={Color.Yellow} icon={Icon.ExclamationMark} />
            )}
          </Detail.Metadata.TagList>

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Algorithm" text={header.alg} icon={Icon.Lock} />

          {header.kid && <Detail.Metadata.Label title="Key ID" text={header.kid} icon={Icon.Key} />}

          <Detail.Metadata.Separator />

          {payload.iss && <Detail.Metadata.Label title="Issuer" text={String(payload.iss)} icon={Icon.Person} />}

          {payload.sub && <Detail.Metadata.Label title="Subject" text={String(payload.sub)} icon={Icon.PersonCircle} />}

          {payload.aud && (
            <Detail.Metadata.Label
              title="Audience"
              text={Array.isArray(payload.aud) ? payload.aud.join(", ") : String(payload.aud)}
              icon={Icon.Globe}
            />
          )}

          <Detail.Metadata.Separator />

          {payload.exp && (
            <Detail.Metadata.Label title="Expires" text={formatPayloadValue("exp", payload.exp)} icon={Icon.Calendar} />
          )}

          {payload.iat && (
            <Detail.Metadata.Label title="Issued At" text={formatPayloadValue("iat", payload.iat)} icon={Icon.Clock} />
          )}

          {payload.nbf && (
            <Detail.Metadata.Label
              title="Not Before"
              text={formatPayloadValue("nbf", payload.nbf)}
              icon={Icon.Calendar}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Token" content={token} />
          <Action.CopyToClipboard title="Copy Header" content={JSON.stringify(header, null, 2)} />
          <Action.CopyToClipboard title="Copy Payload" content={JSON.stringify(payload, null, 2)} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [tokenError, setTokenError] = useState<string | undefined>();
  const [tokenInput, setTokenInput] = useState<string>("");

  useEffect(() => {
    void checkClipboard();
  }, []);

  async function checkClipboard() {
    try {
      const text = await Clipboard.readText();
      if (text && isJWT(text)) {
        // Just prefill the token input instead of automatically submitting
        setTokenInput(text);
        await showToast({
          style: Toast.Style.Success,
          title: "JWT token detected in clipboard",
          message: "Token has been prefilled. You can now add a secret key if needed.",
        });
      }
    } catch {
      // Ignore clipboard errors
    }
  }

  async function handleSubmit(values: FormValues) {
    if (!values.token) {
      setTokenError("Please enter a JWT token");
      return;
    }

    try {
      const details = getTokenDetails(values.token, values.secret);

      // Show validation result as toast if secret was provided
      if (values.secret) {
        const isValid = details.validation?.isValid;
        await showToast({
          style: isValid ? Toast.Style.Success : Toast.Style.Failure,
          title: isValid ? "Token is valid" : "Token validation failed",
          message: isValid ? "The token signature is valid" : details.validation?.error,
        });
      }

      await push(<TokenView token={values.token} details={details} />);
    } catch (error) {
      showFailureToast(error, { title: "Invalid Token" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Parse Token" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle="JWT Parser"
    >
      <Form.Description
        title="JWT Parser"
        text="Analyze and validate JWT tokens with optional signature verification."
      />

      <Form.TextArea
        id="token"
        title="JWT Token"
        placeholder="Enter your JWT token"
        error={tokenError}
        value={tokenInput}
        onChange={(value) => {
          setTokenInput(value);
          setTokenError(undefined);
        }}
      />

      <Form.TextField
        id="secret"
        title="Secret Key (Optional)"
        placeholder="Enter the secret key to validate the token"
      />

      <Form.Description
        title=""
        text="Paste a JWT token or enter it manually, then press Enter or click the 'Parse Token' button to proceed."
      />
    </Form>
  );
}