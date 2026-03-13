import {
  useNavigation,
  showToast,
  Toast,
  confirmAlert,
  Form,
  ActionPanel,
  Action,
  Icon,
  Clipboard,
} from "@raycast/api";
import { useCachedPromise, useForm, showFailureToast } from "@raycast/utils";
import { V2KeysCreateKeyRequestBody } from "@unkey/api/dist/commonjs/models/components";
import { useState } from "react";
import { unkey } from "../unkey";
import { GetApiInfoResponse } from "../utils/types";

type CreateKeyProps = {
  apiInfo: GetApiInfoResponse;
  onKeyCreated: () => void;
};
export default function CreateKey({ apiInfo, onKeyCreated }: CreateKeyProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const [enableRatelimiting, setEnableRatelimiting] = useState(false);

  const { data: identities = [] } = useCachedPromise(async () => {
    const { result } = await unkey.identities.listIdentities({});
    return result.data;
  });

  type FormValues = {
    apiId: string;
    name?: string;
    prefix?: string;
    externalId?: string;
    byteLength?: string;
    creditsRemaining?: string;
    expires: Date | null;
    ratelimitLimit: string;
    ratelimitRefillInterval: string;
    meta?: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const req: V2KeysCreateKeyRequestBody = { apiId: apiInfo.id };

      if (values.name) req.name = values.name;
      if (values.prefix) req.prefix = values.prefix;
      if (values.externalId) req.externalId = values.externalId;
      if (values.byteLength) req.byteLength = +values.byteLength;
      if (values.creditsRemaining) req.credits = { remaining: +values.creditsRemaining };
      if (values.expires) req.expires = values.expires.valueOf();
      if (values.meta) req.meta = JSON.parse(values.meta);

      if (enableRatelimiting) {
        req.ratelimits = [
          {
            name: "",
            limit: +values.ratelimitLimit,
            duration: +values.ratelimitRefillInterval,
          },
        ];
      }

      try {
        const { data } = await unkey.keys.createKey(req);
        showToast(Toast.Style.Success, "Created API Key", data.key);
        if (
          await confirmAlert({
            title: "Copy KEY?",
            message: "YOU WILL NOT BE ABLE TO SEE THE KEY AGAIN.",
            primaryAction: { title: "Copy" },
          })
        ) {
          await Clipboard.copy(data.key);
        }
        onKeyCreated();
        pop();
      } catch (error) {
        await showFailureToast(error);
      }
      setIsLoading(false);
    },
    validation: {
      byteLength(value) {
        if (value)
          if (!Number(value)) return "The item must be a number";
          else if (Number(value) < 8) return "Key length is too short (minimum 8 bytes required)";
      },
      creditsRemaining(value) {
        if (value)
          if (!Number(value)) return "The item must be a number";
          else if (Number(value) <= 0) return "The item must be greater than zero";
      },
      meta(value) {
        if (value) {
          try {
            JSON.parse(value);
          } catch {
            return "The item must be valid JSON";
          }
        }
      },
      ratelimitLimit(value) {
        if (enableRatelimiting)
          if (value) {
            if (!Number(value)) return "The item must be a number";
            else if (Number(value) <= 0) return "The item must be greater than zero";
          } else return "The item is required";
      },
      ratelimitRefillInterval(value) {
        if (enableRatelimiting)
          if (value) {
            if (!Number(value)) return "The item must be a number";
            else if (Number(value) <= 0) return "The item must be greater than zero";
          } else return "The item is required";
      },
    },
    initialValues: {
      byteLength: "16",
      creditsRemaining: "100",
      ratelimitLimit: "10",
      ratelimitRefillInterval: "1000",
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Key"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="All fields are optional" />
      <Form.Description title="API" text={`${apiInfo.name} - ${apiInfo.id}`} />

      <Form.Separator />
      <Form.Description text="General Setup" />
      <Form.TextField
        title="Name"
        placeholder="Enter name"
        info="Optional name to help identify this particular key."
        {...itemProps.name}
      />
      <Form.TextField
        title="Prefix"
        placeholder="Enter prefix"
        info="Prefix to distinguish between different APIs (we'll add the underscore)."
        {...itemProps.prefix}
      />
      <Form.Dropdown
        title="External ID"
        info="ID of the user/workspace in your system for key attribution."
        {...itemProps.externalId}
      >
        <Form.Dropdown.Item title="Select External ID" value="" />
        {identities.map((identity) => (
          <Form.Dropdown.Item
            key={identity.id}
            icon={Icon.Person}
            title={identity.externalId}
            value={identity.externalId}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Byte Length"
        placeholder="Enter bytes"
        info="Key length in bytes - longer keys are more secure."
        {...itemProps.byteLength}
      />

      <Form.Separator />
      <Form.Description text="Credits" />
      <Form.TextField
        title="Remaining"
        placeholder="100"
        info="Enter the remaining amount of uses for this key."
        {...itemProps.creditsRemaining}
      />

      <Form.Separator />
      <Form.Description text="Expiration" />
      <Form.DatePicker
        title="Expiry Date"
        info="The key will be automatically disabled at the specified date and time (UTC)."
        {...itemProps.expires}
      />

      <Form.Separator />
      <Form.Description text="Metadata" />
      <Form.TextArea
        title="Custom Metadata"
        placeholder={`{
  "user": {
    "id": "user_123456",
    "role": "admin",
    "permissions": [
      "read",
      "write",
      "delete"
    ]
  }
}`}
        info="Add structured JSON data to this key. Must be valid JSON format."
        {...itemProps.meta}
      />

      <Form.Separator />
      <Form.Description text="Ratelimit" />
      <Form.Checkbox
        id="enable_ratelimiting"
        label="Enable Ratelimiting"
        value={enableRatelimiting}
        onChange={setEnableRatelimiting}
      />
      {enableRatelimiting && (
        <>
          <Form.TextField
            title="Limit"
            placeholder="10"
            info="Maximum requests in the given time window"
            {...itemProps.ratelimitLimit}
          />
          <Form.TextField
            title="Refill Interval (milliseconds)"
            placeholder="1000"
            info="Time window in milliseconds"
            {...itemProps.ratelimitRefillInterval}
          />
        </>
      )}
    </Form>
  );
}
