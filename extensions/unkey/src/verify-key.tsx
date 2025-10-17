import { Action, ActionPanel, Detail, Form, Icon } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { useState } from "react";
import { unkey } from "./unkey";
import { V2KeysVerifyKeyRequestBody, V2KeysVerifyKeyResponseData } from "@unkey/api/dist/commonjs/models/components";

export default function VerifyKey() {
  const [verifyKeyResponse, setVerifyKeyResponse] = useState<V2KeysVerifyKeyResponseData>();
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<V2KeysVerifyKeyRequestBody>({
    async onSubmit(values) {
      setIsLoading(true);
      try {
        const { data } = await unkey.keys.verifyKey({ key: values.key });
        setVerifyKeyResponse(data);
      } catch (error) {
        await showFailureToast(error);
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      key: FormValidation.Required,
    },
  });

  return !verifyKeyResponse ? (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Key" info="The key you want to verify." placeholder="prefix_xx123abc" {...itemProps.key} />
    </Form>
  ) : (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Key to Clipboard" content={itemProps.key.value || ""} />
        </ActionPanel>
      }
      markdown={`Key: ${itemProps.key.value}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Valid" icon={verifyKeyResponse.valid ? Icon.Check : Icon.Multiply} />
          <Detail.Metadata.Label
            title="Owner ID"
            text={verifyKeyResponse.identity?.externalId || undefined}
            icon={!verifyKeyResponse.identity?.externalId ? Icon.Minus : undefined}
          />
          <Detail.Metadata.Label
            title="Remaining"
            text={verifyKeyResponse.credits?.toString() || undefined}
            icon={!("credits" in verifyKeyResponse) ? Icon.Minus : undefined}
          />
          <Detail.Metadata.Separator />
          {!verifyKeyResponse.meta ? (
            <Detail.Metadata.Label title="Meta" icon={Icon.Minus} />
          ) : (
            <Detail.Metadata.TagList title="Meta">
              {Object.entries(verifyKeyResponse.meta).map(([key, val]) => (
                <Detail.Metadata.TagList.Item key={key} text={`${key}: ${val}`} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          {verifyKeyResponse.ratelimits?.length ? (
            <Detail.Metadata.TagList title="Rate Limit">
              {Object.entries(verifyKeyResponse.ratelimits[0]).map(([key, val]) => (
                <Detail.Metadata.TagList.Item key={key} text={`${key}: ${val}`} />
              ))}
            </Detail.Metadata.TagList>
          ) : (
            <Detail.Metadata.Label title="Rate Limit" icon={Icon.Minus} />
          )}
        </Detail.Metadata>
      }
    />
  );
}
