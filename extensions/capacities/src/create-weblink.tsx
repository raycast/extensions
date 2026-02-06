import { ActionPanel, Action, Form, Icon, closeMainWindow, Clipboard, showToast, Toast, showHUD } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { useActiveTab } from "./helpers/useActiveTab";
import { API_HEADERS, API_URL, handleAPIError, handleUnexpectedError, useCapacitiesStore } from "./helpers/storage";

interface SaveWeblinkBody {
  spaceId: string;
  value: string;
  mdText?: string;
  tags?: string;
}

function isValidURL(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function Command() {
  const { store, triggerLoading, isLoading: storeIsLoading } = useCapacitiesStore();

  useEffect(() => {
    triggerLoading();
  }, []);

  const spacesDropdown = useRef(null);

  const { handleSubmit, itemProps, setValue } = useForm<SaveWeblinkBody>({
    async onSubmit(values) {
      showToast({
        style: Toast.Style.Animated,
        title: "Saving",
      });
      const body = {
        spaceId: store?.spaces.length === 1 ? store.spaces[0].id : values.spaceId,
        url: values.value,
        mdText: values.mdText,
        tags: values.tags ? values.tags.split(",") : [],
      };

      try {
        const response = await fetch(`${API_URL}/save-weblink`, {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          handleAPIError(response);
          return;
        }

        showToast({
          style: Toast.Style.Success,
          title: "Saved",
        });
        showHUD("Weblink created");
        closeMainWindow();
      } catch (e) {
        if (e instanceof Error) {
          handleUnexpectedError(e);
        } else {
          console.log(e);
        }
      }
    },
    validation: {
      value(value) {
        if (!value || value.trim() === "") {
          return "A link is required";
        }
        if (!isValidURL(value)) {
          return "Invalid URL";
        }
      },
      spaceId: spacesDropdown.current ? FormValidation.Required : undefined,
      tags(value) {
        if (value && value.split(",").length > 10) {
          return "Maximum of 10 tags allowed.";
        }
      },
    },
  });

  const activeTab = useActiveTab();

  useEffect(() => {
    async function checkClipboard() {
      try {
        const { text } = await Clipboard.read();
        if (text && isValidURL(text) && !itemProps.value.value) {
          setValue("value", text);
        }
      } catch (e) {
        console.error(e);
      }
    }
    checkClipboard();
  }, []);

  useEffect(() => {
    if (activeTab && !itemProps.value.value) {
      setValue("value", activeTab.url);
    }
  }, [activeTab]);

  return (
    <Form
      isLoading={storeIsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Weblink" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {store && store.spaces.length > 1 && (
        <>
          <Form.Dropdown
            title="Space"
            {...itemProps.spaceId}
            storeValue
            onChange={(value) => setValue("spaceId", value)}
            ref={spacesDropdown}
          >
            {store.spaces &&
              store.spaces.map((space) => (
                <Form.Dropdown.Item key={space.id} value={space.id} title={space.title} icon={Icon.Desktop} />
              ))}
          </Form.Dropdown>
        </>
      )}
      <Form.TextField title="Link" {...itemProps.value} autoFocus />
      <Form.TextField
        title="Tags"
        placeholder="Use a comma separated list of tags."
        {...itemProps.tags}
        info="Optional. Tags added to your web link object. Tags need to exactly match your tag names in Capacities, otherwise they will be created. You can add a maximum of 10 tags."
        storeValue
      />
      <Form.TextArea title="Notes" {...itemProps.mdText} info="Optional. Notes can be formatted in markdown." />
    </Form>
  );
}
