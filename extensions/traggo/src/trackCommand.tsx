import { Form, showToast, showHUD, popToRoot, ActionPanel, Action, Icon, Toast } from "@raycast/api";
import { Authenticated } from "./components/Authenticated";
import { apolloClient } from "./lib/apolloClient";
import { useCreateTimeSpanMutation } from "./graphql/createTimeSpan.hook";
import { useState } from "react";
import { DefaultActions } from "./components/DefaultActions";
import { useTagsWithValues } from "./lib/useTags";
import { getISOTimestamp } from "./lib/dateUtils";

type Values = {
  tags: string[];
  note?: string;
  startTime?: Date;
};

export default function TrackCommand() {
  const [loggedIn, setLoggedIn] = useState(false);
  const { tags, loading } = useTagsWithValues({ skip: !loggedIn });

  const [createTimeSpan] = useCreateTimeSpanMutation({ client: apolloClient });

  const onSubmit = async (values: Values) => {
    try {
      await createTimeSpan({
        client: apolloClient,
        variables: {
          tags: values.tags.map((tag) => ({
            key: tag.split(":")[0],
            value: tag.split(":")[1],
          })),
          start: getISOTimestamp(values.startTime),
          note: values.note ?? "",
        },
      });
      showHUD("Timer started");
      popToRoot();
    } catch (e: any) {
      showToast({ style: Toast.Style.Failure, title: "Failed to start timer", message: e.message });
    }
  };

  return (
    <Authenticated setLoggedIn={setLoggedIn}>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm onSubmit={onSubmit} title="Start Timer" icon={Icon.Play} />
            <DefaultActions />
          </ActionPanel>
        }
        isLoading={!loggedIn || loading}
      >
        <Form.TagPicker id="tags" title="Tags" info={"You can create new tags on the traggo website"}>
          {tags.map((tag) => (
            <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.id} />
          ))}
        </Form.TagPicker>
        <Form.Separator />
        <Form.DatePicker
          id="startTime"
          title="Start time"
          defaultValue={new Date()}
          info="Optionally create the timer from a different point in time"
        />
        <Form.TextArea id="note" title="Note" placeholder="Optional" />
      </Form>
    </Authenticated>
  );
}
