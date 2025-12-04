import { ActionPanel, Action, Form, Icon, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { checkCapacitiesApp } from "./helpers/isCapacitiesInstalled";
import { useEffect, useRef } from "react";
import { API_HEADERS, API_URL, fetchErrorHandler, useCapacitiesStore } from "./helpers/storage";
import ErrorView from "./components/ErrorView";

interface SaveToDailyNoteBody {
  spaceId: string;
  mdText: string;
  noTimeStamp: boolean;
}

export default function Command() {
  useEffect(() => {
    checkCapacitiesApp();
  }, []);

  const { store, triggerLoading, isLoading: storeIsLoading, error } = useCapacitiesStore();

  useEffect(() => {
    triggerLoading();
  }, []);

  const spacesDropdown = useRef(null);

  const { handleSubmit, itemProps, setValue } = useForm<SaveToDailyNoteBody>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Saving");
      const body = {
        spaceId: store?.spaces.length === 1 ? store.spaces[0].id : values.spaceId,
        mdText: values.mdText,
        origin: "commandPalette",
        noTimeStamp: values.noTimeStamp,
      };

      try {
        const response = await fetch(`${API_URL}/save-to-daily-note`, {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(fetchErrorHandler(response.status));
        setValue("mdText", "");
        toast.style = Toast.Style.Success;
        toast.title = "Saved";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      mdText: FormValidation.Required,
      spaceId: spacesDropdown.current ? FormValidation.Required : undefined,
    },
  });

  return error ? (
    <ErrorView error={error} />
  ) : (
    <Form
      isLoading={storeIsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Daily Note" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Note" placeholder="Daily Note" {...itemProps.mdText} />
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
      <Form.Checkbox
        label="No Timestamp"
        info="If checked, no time stamp will be added to the note"
        storeValue
        {...itemProps.noTimeStamp}
      />
    </Form>
  );
}
