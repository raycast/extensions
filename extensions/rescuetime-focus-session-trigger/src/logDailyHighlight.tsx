import { Action, ActionPanel, Icon, Form, Toast, showToast, getPreferenceValues } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState, ChangeEvent } from "react";
import got from "got";

export default function Command() {
  const [titleError, setTitleError] = useState<string | undefined>();

  function dropTitleErrorIfNeeded() {
    if (titleError && titleError.length > 0) {
      setTitleError(undefined);
    }
  }

  const descPlaceholders = [
    `Finished a great workout`,
    `Brushed the dog's teeth`,
    `Had a productive meeting with colleagues`,
    `Tried a delicious new recipe for dinner`,
    `Finished reading an interesting book`,
    `Went for a refreshing walk in the park`,
    `Organized my workspace`,
    `Watched an inspiring lecture`,
    `Listened to a thought-provoking podcast episode`,
    `Learned a new skill`,
    `Visited a museum and admired artwork`,
    `Solved a challenging puzzle`,
    `Watched a thrilling movie at the cinema`,
    `Explored a new hiking trail`,
    `Volunteered for a local charity`,
    `Attended a fun social event`,
    `Caught up with an old friend over coffee`,
    `Took a relaxing bubble bath`,
    `Meditated and found inner peace`,
    `Took a walk around the neighborhood`,
  ];

  return (
    <Form
      enableDrafts={true}
      actions={
        <ActionPanel>
          <PostHighlight />
        </ActionPanel>
      }
    >
      <Form.Description
        title="About Highlights"
        text="Highlights are useful for capturing information by providing a view of the “output” that the user is creating (which is a counterpoint to the “input” attention data that RescueTime logs automatically).
            "
      />
      <Form.Separator />
      <Form.TextArea
        id="description"
        title="Highlight Description"
        info="Required. Must be less than 255 characters."
        placeholder={descPlaceholders[Math.floor(Math.random() * descPlaceholders.length)]}
        error={titleError}
        onChange={dropTitleErrorIfNeeded}
        storeValue={false}
        autoFocus={true}
        onBlur={(event) => {
          const e = event as ChangeEvent<HTMLInputElement>;
          if (e.target.value?.length == 0) {
            setTitleError("Description should't be empty!");
          } else {
            dropTitleErrorIfNeeded();
          }

          if (e.target.value?.length > 254) {
            setTitleError("Description should be less than 255 characters!");
          } else {
            dropTitleErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="source"
        title="Source"
        info="Optional. A short string describing the ‘source’ of the action, or the label that should be applied to it. Think of this as a category that can group multiple highlights together in the UI. "
        placeholder=""
      />

      <Form.DatePicker id="highlight_date" title="Highlight Date" info="Required. Defaults to today." defaultValue={new Date()} />
    </Form>
  );
}

function PostHighlight() {
  interface Preferences {
    APIkey: string;
  }

  const preferences = getPreferenceValues<Preferences>();

  const { handleSubmit, reset } = useForm({
    async onSubmit(values: { description: string; source: number; highlight_date: number }) {
      if (!values.description) {
        showToast({
          style: Toast.Style.Failure,
          title: "Description is required",
        });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Submitting to RescueTime...",
      });

      try {
        await got.post("https://www.rescuetime.com/anapi/highlights_post", {
          json: {
            key: preferences.APIkey,
            description: values.description,
            source: values.source,
            highlight_date: values.highlight_date,
          },
          responseType: "json",
        });

        toast.style = Toast.Style.Success;
        toast.title = "Success";
        toast.message = "Highlight submitted to RescueTime!";

        reset({
          description: "",
        });
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to submit. Try again";
        toast.message = String(error);
      }
    },
  });

  return <Action.SubmitForm icon={Icon.Upload} title="Submit Highlight" onSubmit={handleSubmit} />;
}
