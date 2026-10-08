import { Action, ActionPanel, Icon, Form, Toast, showToast, getPreferenceValues } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState, ChangeEvent } from "react";
import got from "got";

export default function Command() {
  interface Preferences {
    defaultOfflineDuration: number;
  }

  const preferences = getPreferenceValues<Preferences>();
  const [titleError, setTitleError] = useState<string | undefined>();

  function dropTitleErrorIfNeeded() {
    if (titleError && titleError.length > 0) {
      setTitleError(undefined);
    }
  }

  const activityPlaceholders = [
    `Commuted to work`,
    `Picked up lunch for the office`,
    `Had a great idea in the shower`,
    `Heads down on a plane`,
    `Jammed while on the train`,
    `Worked from the car`,
    `Conducted in-person research`,
    `Analyzed data in a public park`,
    `Sketched out a presentation at the local cafe`,
    `Studied trends at a bookstore`,
    `Worked on a proposal at the library`,
    `Took some clients out for drinks`,
    `Took a a much needed personal day`,
  ];

  return (
    <Form
      enableDrafts={true}
      actions={
        <ActionPanel>
          <PostOfflineTime />
        </ActionPanel>
      }
    >
      <Form.Description
        title="About Offline Time"
        text="Record offline time programmatically as an alternative to entering it manually on RescueTime.com (like commuting to a meeting, or working on a plane)."
      />
      <Form.Separator />
      <Form.TextField
        id="activity_name"
        title="Activity Name"
        info="Required. Must be less than 255 characters."
        placeholder={activityPlaceholders[Math.floor(Math.random() * activityPlaceholders.length)]}
        error={titleError}
        onChange={dropTitleErrorIfNeeded}
        storeValue={true}
        autoFocus={true}
        onBlur={(event) => {
          const e = event as ChangeEvent<HTMLInputElement>;
          if (e.target.value?.length == 0) {
            setTitleError("Name should't be empty!");
          } else {
            dropTitleErrorIfNeeded();
          }

          if (e.target.value?.length > 254) {
            setTitleError("Name should be less than 255 characters!");
          } else {
            dropTitleErrorIfNeeded();
          }
        }}
      />
      <Form.TextArea
        id="activity_details"
        title="Activity Details"
        info="Optional. Must be less than 255 characters."
        error={titleError}
        onChange={dropTitleErrorIfNeeded}
        storeValue={false}
        onBlur={(event) => {
          const e = event as ChangeEvent<HTMLInputElement>;

          if (e.target.value?.length > 254) {
            setTitleError("Details should be less than 255 characters!");
          } else {
            dropTitleErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="duration"
        title="Duration"
        info="Required. An integer representing the duration of the offline time block in minutes."
        placeholder=""
        defaultValue={`${preferences.defaultOfflineDuration || 25}`}
      />

      <Form.DatePicker id="start_date" title="Offline Task Start Time" info="Required. Defaults to right now." defaultValue={new Date()} />
    </Form>
  );
}

function PostOfflineTime() {
  interface Preferences {
    APIkey: string;
    defaultOfflineDuration: number;
  }

  const preferences = getPreferenceValues<Preferences>();

  const { handleSubmit, reset } = useForm({
    async onSubmit(values: { activity_name: string; activity_details: string; duration: number; start_date: number }) {
      if (!values.activity_name) {
        showToast({
          style: Toast.Style.Failure,
          title: "Activity name is required",
        });
        return;
      }

      if (!values.start_date) {
        showToast({
          style: Toast.Style.Failure,
          title: "Start date is required",
        });
        return;
      }

      if (!values.duration) {
        showToast({
          style: Toast.Style.Failure,
          title: "Duration is required",
        });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Submitting to RescueTime...",
      });

      try {
        await got.post("https://www.rescuetime.com/anapi/offline_time_post", {
          json: {
            key: preferences.APIkey,
            activity_name: values.activity_name,
            activity_details: values.activity_details,
            duration: values.duration,
            start_time: values.start_date,
          },
          responseType: "json",
        });

        toast.style = Toast.Style.Success;
        toast.title = "Success";
        toast.message = "Offline time submitted to RescueTime!";

        reset({
          activity_name: "",
          activity_details: "",
        });
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to submit. Try again";
        toast.message = String(error);
      }
    },
  });

  return <Action.SubmitForm icon={Icon.Upload} title="Submit Offline Time" onSubmit={handleSubmit} />;
}
