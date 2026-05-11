import { useState } from "react";
import { getCronJobs } from "../utils/hestia";
import { Action, ActionPanel, Color, Form, Icon, List, showToast, useNavigation } from "@raycast/api";
import { getTextAndIconFromVal } from "../utils";
import { FormValidation, useForm } from "@raycast/utils";
import useHestia from "../utils/hooks/useHestia";
import { AddCronJobFormValues } from "../types/cron-jobs";

type ListCronJobsComponentProps = {
  user: string;
};
export default function ListCronJobsComponent({ user }: ListCronJobsComponentProps) {
  const { isLoading, data: jobs, revalidate } = getCronJobs(user);

  return (
    <List navigationTitle={`Users / ${user} / Cron Jobs`} isLoading={isLoading} isShowingDetail>
      {jobs &&
        Object.entries(jobs).map(([job, data]) => (
          <List.Item
            key={job}
            title={job}
            icon={{ source: Icon.Clock, tintColor: data.SUSPENDED === "yes" ? Color.Yellow : Color.Green }}
            detail={
              <List.Item.Detail
                markdown={data.CMD}
                metadata={
                  <List.Item.Detail.Metadata>
                    {Object.entries(data).map(([key, val]) => {
                      const { text, icon } = getTextAndIconFromVal(val);
                      return <List.Item.Detail.Metadata.Label key={key} title={key} text={text} icon={icon} />;
                    })}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy to Clipboard as JSON"
                  icon={Icon.Clipboard}
                  content={JSON.stringify(data)}
                />
              </ActionPanel>
            }
          />
        ))}
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Add Cron Job"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Cron Job"
                  icon={Icon.Plus}
                  target={<AddJob user={user} onJobAdded={revalidate} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type AddJobProps = {
  user: string;
  onJobAdded: () => void;
};
function AddJob({ user, onJobAdded }: AddJobProps) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);

  const { handleSubmit, itemProps, values } = useForm<AddCronJobFormValues>({
    onSubmit() {
      setExecute(true);
    },
    validation: {
      minute: FormValidation.Required,
      hour: FormValidation.Required,
      day: FormValidation.Required,
      month: FormValidation.Required,
      weekday: FormValidation.Required,
      command: FormValidation.Required,
    },
  });

  const { isLoading } = useHestia<Record<string, never>>("v-add-cron-job", "Adding Cron Job", {
    body: [user, values.minute, values.hour, values.day, values.month, values.weekday, values.command],
    execute,
    async onData() {
      await showToast({
        title: "SUCCESS",
        message: `Added Cron Job`,
      });
      onJobAdded();
      pop();
    },
    onError() {
      setExecute(false);
    },
  });

  return (
    <Form
      navigationTitle="Add Cron Job"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Command" {...itemProps.command} />

      <Form.TextField title="Minute" placeholder="*" {...itemProps.minute} />
      <Form.TextField title="Hour" placeholder="*" {...itemProps.hour} />
      <Form.TextField title="Day" placeholder="*" {...itemProps.day} />
      <Form.TextField title="Month" placeholder="*" {...itemProps.month} />
      <Form.TextField title="Day of Week" placeholder="*" {...itemProps.weekday} />
    </Form>
  );
}
