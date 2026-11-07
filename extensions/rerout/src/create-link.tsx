import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import { errorMessage, getClient } from "./rerout";

interface FormValues {
  targetUrl: string;
  domainHostname: string;
  code: string;
}

export default function CreateLink() {
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating link…",
      });
      try {
        const link = await getClient().links.create({
          target_url: values.targetUrl.trim(),
          ...(values.domainHostname.trim()
            ? { domain_hostname: values.domainHostname.trim() }
            : {}),
          ...(values.code.trim() ? { code: values.code.trim() } : {}),
        });
        await Clipboard.copy(link.short_url);
        toast.style = Toast.Style.Success;
        toast.title = "Link created";
        toast.message = `${link.short_url} (copied)`;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create link";
        toast.message = errorMessage(error);
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      targetUrl: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Link"
            icon={Icon.Link}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Destination URL"
        placeholder="https://example.com/page"
        {...itemProps.targetUrl}
      />
      <Form.TextField
        title="Custom Domain"
        placeholder="go.brand.com (optional, must be verified)"
        {...itemProps.domainHostname}
      />
      <Form.TextField
        title="Custom Path"
        placeholder="summer-sale (optional, requires a custom domain)"
        {...itemProps.code}
      />
      <Form.Description text="The short link is copied to your clipboard on success." />
    </Form>
  );
}
