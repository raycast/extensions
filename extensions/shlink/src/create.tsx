import { ShlinkObject, TagPickerWithAddTag } from "./shared";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";
import fetch from "node-fetch";
import { urlType } from "./shared/form-validation";
import Style = Toast.Style;

interface Request {
  longUrl: string;
  deviceLongUrls?: {
    android: string;
    ios: string;
    desktop: string;
  };
  validSince?: string; // Date
  validUntil?: string; // Date
  maxVisits?: number;
  tags?: string[];
  title?: string;
  crawlable?: boolean;
  forwardQuery?: boolean;
  customSlug?: string;
  findIfExists?: boolean;
  domain?: string;
  shortCodeLength?: number;
}

interface Form {
  longUrl: string;
  customSlug?: string; // nullable
  deviceAndroid?: string; // nullable
  deviceIos?: string | undefined; // nullable
  deviceDesktop?: string | undefined; // nullable
  validSince?: Date | null; // nullable
  validUntil?: Date | null; // nullable
  maxVisits?: string | undefined; // nullable number
  tags: string[];
  title?: string | undefined; // nullable
  crawlable?: boolean | undefined; // nullable
  forwardQuery: boolean | undefined; // nullable
  findIfExists?: boolean | undefined; // nullable
  domain?: string; // nullable
  shortCodeLength?: string; // nullable number
}

export default function NewShlink() {
  const pref = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const validateDevices = (value: string | undefined) => {
    const devices = [itemProps.deviceAndroid.value, itemProps.deviceIos.value, itemProps.deviceDesktop.value];
    const allDevices = devices.every((device): boolean => !!device);
    const anyDevices = devices.some((device): boolean => !!device);
    if (!allDevices && anyDevices && !value?.trim()) {
      return "You must fill all device fields or leave them all empty";
    }
  };

  const { itemProps, handleSubmit, setValidationError, reset, focus } = useForm<Form>({
    async onSubmit(formData: Form) {
      setIsLoading(true);
      const addDevices = [formData.deviceAndroid, formData.deviceIos, formData.deviceDesktop].every((v) => v);

      const errorDevices = Object.entries({
        deviceAndroid: validateDevices(formData.deviceAndroid),
        deviceIos: validateDevices(formData.deviceIos),
        deviceDesktop: validateDevices(formData.deviceDesktop),
      }).filter(([, value]) => value);

      if (errorDevices.length > 0) {
        setIsLoading(false);
        errorDevices.forEach(([key, value]) => {
          setValidationError(key as keyof Form, value);
          focus(key as keyof Form);
        });
        return false;
      }

      const deviceLongUrls = {
        android: formData.deviceAndroid || "",
        ios: formData.deviceIos || "",
        desktop: formData.deviceDesktop || "",
      };

      const toast = await showToast(Style.Animated, "Update short URL", "Updating short URL...");
      const data = await fetch(`${pref.shlinkUrl}/rest/v3/short-urls`, {
        method: "POST",
        headers: {
          "X-Api-Key": pref.shlinkApiKey,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          longUrl: formData.longUrl,
          deviceLongUrls: addDevices ? deviceLongUrls : null,
          validSince: formData.validSince?.toISOString() || null,
          validUntil: formData.validUntil?.toISOString() || null,
          maxVisits: formData.maxVisits ? +formData.maxVisits : null,
          tags: formData.tags,
          title: formData.title || null,
          crawlable: formData.crawlable || false,
          forwardQuery: formData.forwardQuery || false,
          findIfExists: formData.findIfExists || false,
          domain: formData.domain || null,
          shortCodeLength: formData.shortCodeLength ? +formData.shortCodeLength : null,
        } as Request),
      });
      setIsLoading(false);
      if (!data.ok) {
        toast.style = Style.Failure;
        toast.title = "Failed to Create Short URL";
        if (data.status === 400) {
          const json = (await data.json()) as {
            detail: string;
            invalidElements: {
              [key: string]: string;
            };
          };
          const error = json.detail;

          if (error && Array.isArray(json.invalidElements)) {
            console.log("invalidElements", json.invalidElements);
            for (const key of json.invalidElements) {
              if (key === "deviceLongUrls") {
                console.log("deviceLongUrls", error);
                focus("deviceAndroid");
                setValidationError("deviceAndroid", error);
                setValidationError("deviceIos", error);
                setValidationError("deviceDesktop", error);
                continue;
              }
              focus(key as keyof Form);
              setValidationError(key as keyof Form, error);
            }
            toast.message = error;
            toast.primaryAction = {
              onAction: () => Clipboard.copy(JSON.stringify(json)),
              title: "Copy Response to Clipboard",
            };
            return false;
          }
        } else {
          const resp = await data.text();
          toast.message = `Response: "${resp}"`;
          toast.primaryAction = { onAction: () => Clipboard.copy(resp), title: "Copy Response to Clipboard" };
          toast.secondaryAction = { onAction: () => pop(), title: "Close" };
        }
      }
      const item = (await data.json()) as ShlinkObject;
      await Clipboard.copy(item.shortUrl);
      toast.style = Style.Success;
      toast.title = "Created Short URL!";
      toast.message = item.shortUrl;
      pop();
      return true;
    },
    validation: {
      longUrl: urlType(true),
      maxVisits: (value) => {
        if (value && (isNaN(+value) || +value < 0)) {
          return "Please enter a positive number or zero";
        }
      },
      shortCodeLength: (value) => {
        if (value && (isNaN(+value) || +value < 0)) {
          return "Please enter a positive number or zero";
        }
      },
      deviceAndroid: urlType(),
      deviceIos: urlType(),
      deviceDesktop: urlType(),
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
      navigationTitle="Create New Short URL"
      isLoading={isLoading}
    >
      <Form.TextField title="Long URL" {...itemProps.longUrl} info="The long URL this short URL will redirect to" />
      <Form.TextField title="Title" {...itemProps.title} info="A descriptive title of the short URL" />
      <Form.TextField title="Domain" {...itemProps.domain} info="The domain to which the short URL will be attached" />
      <Form.TextField
        title="Custom Slug"
        {...itemProps.customSlug}
        info="A unique custom slug to be used instead of the generated short code"
      />
      <Form.TextField
        title="Short Code Length"
        {...itemProps.shortCodeLength}
        info="The length for generated short code. It has to be at least 4 and defaults to 5. It will be ignored when customSlug is provided"
      />
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
      <Form.Checkbox
        label="Find if Exist"
        {...itemProps.findIfExists}
        info="Will force existing matching URL to be returned if found, instead of creating a new one"
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
