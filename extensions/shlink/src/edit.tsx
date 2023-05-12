import { apiFetch, ShlinkObject, TagPickerWithAddTag } from "./shared";
import { Action, ActionPanel, Clipboard, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import Style = Toast.Style;

interface Props {
  item: ShlinkObject;
}

interface Form {
  longUrl: string;
  deviceAndroid: string | undefined; // nullable
  deviceIos: string | undefined; // nullable
  deviceDesktop: string | undefined; // nullable
  validSince: Date | null; // nullable
  validUntil: Date | null; // nullable
  maxVisits: string | undefined; // nullable number
  tags: string[];
  title: string | undefined; // nullable
  crawlable: boolean;
  forwardQuery: boolean;
}

export function EditShlink({ item }: Props) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const { itemProps, handleSubmit, setValidationError, reset } = useForm<Form>({
    async onSubmit(formData: Form) {
      setIsLoading(true);
      const toast = await showToast(Style.Animated, "Update short URL", "Updating short URL...");
      const { response, text } = await apiFetch({
        restPath: `short-urls/${item.shortCode}`,
        method: "PATCH",
        data: JSON.stringify({
          longUrl: formData.longUrl,
          deviceLongUrls: {
            android: formData.deviceAndroid || null,
            ios: formData.deviceIos || null,
            desktop: formData.deviceDesktop || null,
          },
          validSince: formData.validSince?.toISOString() || null,
          validUntil: formData.validUntil?.toISOString() || null,
          maxVisits: formData.maxVisits || null,
          tags: formData.tags,
          title: formData.title || null,
          crawlable: formData.crawlable || false,
          forwardQuery: formData.forwardQuery || false,
        }),
      });
      setIsLoading(false);
      if (!response.ok) {
        toast.style = Style.Failure;
        toast.title = "Failed to update short URL";
        if (response.status === 400) {
          const json = JSON.parse(text) as {
            detail: string;
            invalidElements: {
              [key: string]: string;
            };
          };
          const error = json.detail;

          if (error && Array.isArray(json.invalidElements)) {
            for (const key of json.invalidElements) {
              setValidationError(key as keyof Form, error);
            }
            toast.message = error;
            return false;
          }
        } else {
          toast.message = `Response: "${text}"`;
          toast.primaryAction = { onAction: () => Clipboard.copy(text), title: "Copy Response to Clipboard" };
          toast.secondaryAction = { onAction: () => pop(), title: "Close" };
        }
      }
      toast.style = Style.Success;
      toast.title = "Updated short URL";
      toast.message = `Successfully updated short URL ${item.shortUrl}`;
      pop();
      return true;
    },
    initialValues: {
      longUrl: item.longUrl,
      deviceAndroid: item.deviceLongUrls.android || undefined,
      deviceIos: item.deviceLongUrls.ios || undefined,
      deviceDesktop: item.deviceLongUrls.desktop || undefined,
      validSince: item.meta.validSince ? new Date(item.meta.validSince) : null,
      validUntil: item.meta.validUntil ? new Date(item.meta.validUntil) : null,
      maxVisits: item.meta.maxVisits?.toString() || undefined,
      tags: item.tags,
      title: item.title || undefined,
      crawlable: item.crawlable || false,
      forwardQuery: item.forwardQuery || false,
    },
    validation: {
      longUrl: FormValidation.Required,
      maxVisits: (value) => {
        if (value && (isNaN(+value) || +value < 0)) {
          return "Please enter a positive number or zero";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          <Action title="Reset" onAction={reset} shortcut={{ key: "r", modifiers: ["cmd"] }} />
        </ActionPanel>
      }
      navigationTitle={`Edit ${item.shortUrl}`}
      isLoading={isLoading}
    >
      <Form.TextField title="Long URL" {...itemProps.longUrl} info="The long URL this short URL will redirect to" />
      <Form.TextField title="Title" {...itemProps.title} info="A descriptive title of the short URL" />
      <TagPickerWithAddTag title="Tags" {...itemProps.tags} info="The list of tags to set to the short URL" />
      <Form.Checkbox
        label="Crawlable"
        {...itemProps.crawlable}
        info="Tells if this URL will be included as 'Allow' in Shlink's robots.txt"
      />
      <Form.Checkbox
        label="Forward Query"
        {...itemProps.forwardQuery}
        info="Tells if the query params should be forwarded from the short URL to the long one, as explained in the docs"
      />
      <Form.Separator />
      <Form.Description text="Device Long Url" />
      <Form.TextField
        title="Android URL"
        {...itemProps.deviceAndroid}
        info="The long URL to redirect to when the short URL is visited from a device running Android"
      />
      <Form.TextField
        title="iOS URL"
        {...itemProps.deviceIos}
        info="The long URL to redirect to when the short URL is visited from a device running iOS"
      />
      <Form.TextField
        title="Desktop URL"
        {...itemProps.deviceDesktop}
        info="The long URL to redirect to when the short URL is visited from a desktop browser"
      />
      <Form.Separator />
      <Form.Description text="Metadata info" />
      <Form.DatePicker
        title="Valid Since"
        {...itemProps.validSince}
        info="The date from which this short code will be valid"
      />
      <Form.DatePicker
        title="Valid Until"
        {...itemProps.validUntil}
        info="The date until which this short code will be valid"
      />
      <Form.TextField
        title="Max Visits"
        {...itemProps.maxVisits}
        info="The maximum number of allowed visits for this short code"
      />
    </Form>
  );
}
