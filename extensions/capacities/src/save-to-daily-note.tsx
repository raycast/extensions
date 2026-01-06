import { ActionPanel, Action, Form, Icon, showToast, Toast, closeMainWindow, showHUD } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { API_HEADERS, API_URL, handleAPIError, handleUnexpectedError, useCapacitiesStore } from "./helpers/storage";

interface SaveToDailyNoteBody {
  spaceId: string;
  mdText: string;
}

export default function Command() {
  const { store, triggerLoading, isLoading: storeIsLoading } = useCapacitiesStore();

  useEffect(() => {
    triggerLoading();
  }, []);

  const spacesDropdown = useRef(null);

  const { handleSubmit, itemProps, setValue } = useForm<SaveToDailyNoteBody>({
    async onSubmit(values) {
      showToast({
        style: Toast.Style.Animated,
        title: "Saving",
      });
      const body = {
        spaceId: store?.spaces.length === 1 ? store.spaces[0].id : values.spaceId,
        mdText: values.mdText,
      };

      try {
        const response = await fetch(`${API_URL}/save-to-daily-note`, {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          handleAPIError(response);
          return;
        }
        setValue("mdText", "");
        showToast({
          style: Toast.Style.Success,
          title: "Saved",
        });

        showHUD("Notes saved to daily note");
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
      mdText: FormValidation.Required,
      spaceId: spacesDropdown.current ? FormValidation.Required : undefined,
    },
  });

  return (
    <Form
      isLoading={storeIsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Daily Note" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
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
              store.spaces.map((space) => (
                <Form.Dropdown.Item key={space.id} value={space.id} title={space.title} icon={Icon.Desktop} />
              ))}
          </Form.Dropdown>
        </>
      )}
      <Form.TextArea title="Note" placeholder="Daily Note" {...itemProps.mdText} />
    </Form>
  );
}
