import { ActionPanel, Action, Form, Icon, closeMainWindow, showToast, Toast, showHUD } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { API_HEADERS, API_URL, handleAPIError, handleUnexpectedError, useCapacitiesStore } from "./helpers/storage";

interface SaveWeblinkBody {
  spaceId: string;
  title: string;
  mdText?: string;
  priority?: string;
  date?: Date;
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

      // date processing
      const dateTime = values.date;
      let dateObject:
        | {
            dateResolution: "time" | "day";
            startTime: string;
          }
        | undefined = undefined;
      if (dateTime) {
        if (
          (dateTime.getMilliseconds() === 0 || dateTime.getMilliseconds() === 1) &&
          dateTime.getSeconds() === 0 &&
          dateTime.getMinutes() === 0 &&
          dateTime.getHours() === 0
        ) {
          const newDate = new Date();
          newDate.setUTCHours(0, 0, 0, 0);
          newDate.setUTCDate(dateTime.getDate());
          newDate.setUTCMonth(dateTime.getMonth());
          newDate.setUTCFullYear(dateTime.getFullYear());
          dateObject = {
            dateResolution: "day",
            startTime: newDate.toISOString(),
          };
        } else {
          dateObject = {
            dateResolution: "time",
            startTime: dateTime.toISOString(),
          };
        }
      }

      const body = {
        spaceId: store?.spaces.length === 1 ? store.spaces[0].id : values.spaceId,
        title: values.title,
        mdText: values.mdText?.trim()?.length ? values.mdText.trim() : undefined,
        priority: values.priority === "empty" ? undefined : values.priority,
        date: dateObject,
      };

      console.log(body);

      try {
        const response = await fetch(`${API_URL}/save-task`, {
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
        showHUD("Task created");
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
      title(value) {
        if (!value || value.trim() === "") {
          return "A title is required";
        }
      },
      spaceId: spacesDropdown.current ? FormValidation.Required : undefined,
    },
  });

  return (
    <Form
      isLoading={storeIsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
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
      <Form.TextField title="Title" {...itemProps.title} autoFocus />
      <Form.Separator />
      <Form.Dropdown id="priority" title="Priority" defaultValue="empty">
        <Form.Dropdown.Item value="empty" title="No Priority" icon={Icon.Minus} />
        <Form.Dropdown.Item value="low" title="Low" icon={Icon.Exclamationmark} />
        <Form.Dropdown.Item value="medium" title="Medium" icon={Icon.Exclamationmark2} />
        <Form.Dropdown.Item value="high" title="High" icon={Icon.Exclamationmark3} />
      </Form.Dropdown>
      <Form.DatePicker id="date" title="Date" defaultValue={null} />
      <Form.TextArea title="Notes" {...itemProps.mdText} info="Optional. Notes can be formatted in markdown." />
    </Form>
  );
}
