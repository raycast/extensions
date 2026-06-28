import { useNavigation, showToast, Form, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise, useForm, showFailureToast } from "@raycast/utils";
import { KeyResponseData, V2KeysUpdateKeyRequestBody } from "@unkey/api/dist/commonjs/models/components";
import { useState } from "react";
import ErrorComponent from "../components/ErrorComponent";
import { unkey } from "../unkey";

type UpdateKeyProps = {
  apiKey: KeyResponseData;
  onKeyUpdated: () => void;
};
export default function UpdateKey({ apiKey, onKeyUpdated }: UpdateKeyProps) {
  const { pop, push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const { data: identities = [] } = useCachedPromise(async () => {
    const { result } = await unkey.identities.listIdentities({});
    return result.data;
  });

  type FormValues = {
    externalId: string;
    creditsRemaining?: string;
    expires: Date | null;
    meta: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      setIsLoading(true);

      const req: V2KeysUpdateKeyRequestBody = {
        keyId: apiKey.keyId,
        externalId: values.externalId || null,
        meta: values.meta ? JSON.parse(values.meta) : null,
        expires: values.expires ? values.expires.valueOf() : null,
        credits: {
          remaining: values.creditsRemaining ? +values.creditsRemaining : null,
        },
      };

      try {
        await unkey.keys.updateKey(req);
        await showToast({
          title: "Updated Key",
          message: apiKey.keyId,
        });
        onKeyUpdated();
        pop();
      } catch (error) {
        await showFailureToast(error);
        push(<ErrorComponent error={error} />);
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      meta(value) {
        if (value) {
          try {
            JSON.parse(value);
          } catch {
            return "The item must be valid JSON";
          }
        }
      },
    },
    initialValues: {
      externalId: apiKey.identity?.externalId,
      creditsRemaining: apiKey.credits?.remaining?.toString() || "",
      expires: apiKey.expires ? new Date(apiKey.expires) : null,
      meta: JSON.stringify(apiKey.meta),
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Update Key"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
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

      <Form.Separator />
      <Form.Description text="Credits" />
      <Form.TextField
        title="Remaining"
        placeholder="100"
        info="Enter the remaining amount of uses for this key."
        {...itemProps.creditsRemaining}
      />

      <Form.Separator />

      <Form.DatePicker
        title="Expiry Date"
        info="The key will be automatically disabled at the specified date and time (UTC)."
        {...itemProps.expires}
      />

      <Form.Separator />
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
    </Form>
  );
}
