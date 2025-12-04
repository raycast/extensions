import {
  ActionPanel,
  Action,
  Form,
  Icon,
  closeMainWindow,
  Clipboard,
  showToast,
  Toast,
  PopToRootType,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { checkCapacitiesApp } from "./helpers/isCapacitiesInstalled";
import { useEffect, useRef } from "react";
import { useActiveTab } from "./helpers/useActiveTab";
import { API_HEADERS, API_URL, fetchErrorHandler, useCapacitiesStore } from "./helpers/storage";

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
  useEffect(() => {
    checkCapacitiesApp();
  }, []);

  const { store, triggerLoading, isLoading: storeIsLoading } = useCapacitiesStore();

  useEffect(() => {
    triggerLoading();
  }, []);

  const spacesDropdown = useRef(null);

  const { handleSubmit, itemProps, setValue } = useForm<SaveWeblinkBody>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Saving");
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
        if (!response.ok) throw new Error(fetchErrorHandler(response.status));

        toast.style = Toast.Style.Success;
        toast.title = "Saved";
        await closeMainWindow({
          popToRootType: PopToRootType.Immediate,
        });
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
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
      <Form.TextField title="Link" placeholder="Link here" {...itemProps.value} />
      <Form.TextField
        title="Tags"
        placeholder="Use a comma separated list of tags."
        {...itemProps.tags}
        info="Optional. Tags added to your web link object. Tags need to exactly match your tag names in Capacities, otherwise they will be created. You can add a maximum of 10 tags."
        storeValue
      />
      <Form.TextArea title="Notes" {...itemProps.mdText} info="Optional" />
      {store && store.spaces.length > 1 && (
        <>
          <Form.Dropdown
            title="Space"
            {...itemProps.spaceId}
            storeValue
            onChange={() => setValue("spaceId", "")}
            ref={spacesDropdown}
          >
            {store.spaces &&
              store.spaces.map((space) => <Form.Dropdown.Item key={space.id} value={space.id} title={space.title} />)}
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}
