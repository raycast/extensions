import { Action, ActionPanel, Color, Detail, Icon, LaunchProps, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { ErrorResponse, ValidateNumberResponse } from "./types";
import fetch, { FetchError } from "node-fetch";
import { API_HEADERS, API_URL } from "./constants";
import { showFailureToast } from "@raycast/utils";
import ErrorComponent from "./components/ErrorComponent";

export default function ValidateNumber(props: LaunchProps<{ arguments: Arguments.ValidateNumber }>) {
  const { number } = props.arguments;

  const [isLoading, setIsLoading] = useState(false);
  const [validateResponse, setValidateResponse] = useState<ValidateNumberResponse>();
  const [error, setError] = useState("");

  async function validateNumber() {
    try {
      setIsLoading(true);
      await showToast({
        title: "Validating Number",
        style: Toast.Style.Animated,
      });
      const apiResponse = await fetch(API_URL + `validate?number=${number}`, { headers: API_HEADERS });
      if (!apiResponse.ok) {
        const errorResponse = (await apiResponse.json()) as ErrorResponse;
        const { message } = errorResponse;
        await showFailureToast(message);
        setError(message);
      } else {
        const response = (await apiResponse.json()) as ValidateNumberResponse;
        await showToast({
          title: "SUCCESS",
          style: Toast.Style.Success,
          message: `'${number}' is ${response.valid ? "Valid" : "Invalid"}`,
        });
        setValidateResponse(response);
      }
    } catch (error) {
      let message = "Something went wrong";
      if (error instanceof FetchError) {
        message = error.message;
      }
      await showFailureToast(message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    validateNumber();
  }, []);

  const markdown = `## Number: ${number}
    
## Valid: ${validateResponse ? (validateResponse.valid ? "✅" : "❌") : "🔁"}`;

  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        !validateResponse ? undefined : (
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy All as JSON to Clipboard"
              icon={Icon.Clipboard}
              content={JSON.stringify(validateResponse)}
            />
          </ActionPanel>
        )
      }
      metadata={
        !validateResponse ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Number" text={validateResponse.number} />
            <Detail.Metadata.Label
              title="Valid"
              icon={{
                source: validateResponse.valid ? Icon.Check : Icon.Multiply,
                tintColor: validateResponse.valid ? Color.Green : Color.Red,
              }}
            />
            <Detail.Metadata.Label
              title="Local Format"
              text={validateResponse.local_format || ""}
              icon={!validateResponse.local_format ? Icon.Minus : undefined}
            />
            <Detail.Metadata.Label
              title="International Format"
              text={validateResponse.international_format || ""}
              icon={!validateResponse.international_format ? Icon.Minus : undefined}
            />
            <Detail.Metadata.Label
              title="Country Prefix"
              text={validateResponse.country_prefix || ""}
              icon={!validateResponse.country_prefix ? Icon.Minus : undefined}
            />
            <Detail.Metadata.Label
              title="Country Code"
              text={validateResponse.country_code || ""}
              icon={!validateResponse.country_code ? Icon.Minus : undefined}
            />
            <Detail.Metadata.Label
              title="Country Name"
              text={validateResponse.country_name || ""}
              icon={!validateResponse.country_name ? Icon.Minus : undefined}
            />
            <Detail.Metadata.Label
              title="Location"
              text={validateResponse.location || ""}
              icon={!validateResponse.location ? Icon.Minus : undefined}
            />
            <Detail.Metadata.Label
              title="Carrier"
              text={validateResponse.carrier || ""}
              icon={!validateResponse.carrier ? Icon.Minus : undefined}
            />
            <Detail.Metadata.Label
              title="Line Type"
              text={validateResponse.line_type || ""}
              icon={!validateResponse.line_type ? Icon.Minus : undefined}
            />
          </Detail.Metadata>
        )
      }
    />
  );
}
