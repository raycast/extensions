import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Clipboard,
  showToast,
  Toast,
  confirmAlert,
  open,
  popToRoot,
  Icon,
} from "@raycast/api";
import { useForm, FormValidation, useFetch } from "@raycast/utils";
import { useEffect } from "react";

import * as Errors from "./utils/Error.json";
import { FormValues, Instance } from "./utils/Types";

type ErrorKey = keyof typeof Errors;

function getErrorMessage(key: ErrorKey) {
  return Errors[key];
}

async function download(
  values: FormValues,
  instance:
    | Instance
    | undefined
    | { id: string; name: string; url: string; apiKey: string },
) {
  const apiUrl = instance?.url;
  const apiKey = instance?.apiKey;

  await showToast({
    style: Toast.Style.Animated,
    title: "Processing",
  });
  if (apiUrl) {
    await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(apiKey !== undefined ? { Authorization: `Api-Key ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        url: values.url,
        downloadMode: values.downloadMode,
        filenameStyle: "nerdy",
      }),
      signal: AbortSignal.timeout(2500),
    })
      .then(async (response) => {
        const resJson = await response.json();
        if (!response.ok) {
          throw resJson;
        }
        return resJson;
      })
      .then(async (data) => {
        if (data && data.status === "redirect") {
          await showToast({
            style: Toast.Style.Animated,
            title: "Redirecting",
            message: `Redirecting to ${data.url}`,
          });
          await confirmAlert({
            title: `Open ${data?.filename} ?`,
            primaryAction: {
              title: "Open",
              onAction: async () => {
                await showToast({
                  style: Toast.Style.Success,
                  title: "Download started",
                });
                await popToRoot();
                await open(data.url);
              },
            },
            dismissAction: {
              title: "Cancel",
              onAction: async () => {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Download canceled",
                });
              },
            },
          });
        }
        if (data && data.status === "tunnel") {
          await showToast({
            style: Toast.Style.Animated,
            title: "Tunnel created",
            message: `Tunnel ${new URL(data.url).searchParams.get("id")} created.`,
          });
          await confirmAlert({
            title: `Download ${data?.filename} ?`,
            primaryAction: {
              title: "Download",
              onAction: async () => {
                await showToast({
                  style: Toast.Style.Success,
                  title: "Download started",
                });
                await popToRoot();
                await open(data.url);
              },
            },
            dismissAction: {
              title: "Cancel",
              onAction: async () => {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Download canceled",
                });
              },
            },
          });
        }
      })
      .catch(async (error) => {
        if (error?.status === "error") {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to download",
            message: getErrorMessage(error?.error?.code),
          });
          return;
        }
        if (error?.name) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to download",
            message: getErrorMessage(error?.error?.code),
          });
          return;
        }
        console.error({
          name: error.name,
        });
        await showToast({
          style: Toast.Style.Failure,
          title: error?.name || "Failed to download",
          message: getErrorMessage(error?.message),
        });
      });
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to download",
      message: "API URL not found",
    });
  }
}

export default function Command() {
  const {
    enableCustomInstance,
    cobaltInstanceUrl,
    cobaltInstanceUseApiKey,
    cobaltInstanceApiKey,
    instanceSourceUrl = "https://raw.githubusercontent.com/MonsPropre/cobalt-for-raycast/main/assets/instances.json",
  } = getPreferenceValues();

  const { data, revalidate } = useFetch<Instance[]>(instanceSourceUrl, {
    keepPreviousData: true,
  });

  // Parse 'data' string JSON if needed
  let instances: Instance[] = [];
  if (typeof data === "string") {
    try {
      instances = JSON.parse(data);
    } catch (error) {
      instances = [];
      console.error("Failed to parse instances JSON:", error);
    }
  } else if (Array.isArray(data)) {
    instances = data;
  }

  if (enableCustomInstance) {
    instances.unshift({
      id: "custom",
      name: "Custom",
      url: cobaltInstanceUrl,
      apiKey: cobaltInstanceUseApiKey ? cobaltInstanceApiKey : undefined,
    });
  }

  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    async onSubmit(values) {
      await download(
        values,
        instances.find((instance) => instance.id === values.instance),
      );
    },
    validation: {
      url: (value) => {
        try {
          const url = new URL(value as string);
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            return "Invalid protocol";
          }
          return;
        } catch (_) {
          return "Invalid URL";
        }
      },
      downloadMode: FormValidation.Required,
    },
  });

  useEffect(() => {
    (async () => {
      const text = await Clipboard.readText();
      try {
        const url = new URL(text as string);
        if (url.protocol === "http:" || url.protocol === "https:") {
          await showToast({
            style: Toast.Style.Success,
            title: "Loaded URL from Clipboard",
            message: text,
          });
          reset({ url: text, downloadMode: "auto" });
        }
      } catch (_) {
        // Do nothing
      }
    })();
  }, [reset]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          <Action
            title="Reload Instances"
            onAction={async () => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Reloading instances",
              });
              revalidate();
              setTimeout(async () => await toast.hide(), 50);
            }}
            icon={Icon.RotateClockwise}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Instance" {...itemProps.instance}>
        {instances.length > 0 ? (
          instances.map((instance, idx) => (
            <Form.Dropdown.Item
              key={idx}
              value={instance.id}
              title={instance.name}
            />
          ))
        ) : (
          <Form.Dropdown.Item value="" title="(No instances found)" />
        )}
      </Form.Dropdown>

      <Form.TextField
        title="URL"
        placeholder="https://www.youtube.com/watch?v=ykaj0pS4A1A"
        {...itemProps.url}
      />

      <Form.Dropdown
        title="Download Mode"
        storeValue
        {...itemProps.downloadMode}
      >
        <Form.Dropdown.Item value="auto" title="Auto" icon="✨" />
        <Form.Dropdown.Item value="audio" title="Audio" icon="🎶" />
        <Form.Dropdown.Item value="mute" title="Mute" icon="🔇" />
      </Form.Dropdown>
    </Form>
  );
}
