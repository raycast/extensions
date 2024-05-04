import { Action, ActionPanel, Form, environment, popToRoot } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { Configuration } from "../lib/configurations";

export default function ConfigurationFormView() {
  const [descriptionError, setDescriptionError] = useState<string | undefined>();
  const [repoNameError, setRepoNameError] = useState<string | undefined>();
  const [titleError, setTitleError] = useState<string | undefined>();
  const [configState, setConfig] = useCachedState<Configuration[]>("config", [], {
    cacheNamespace: `${environment.extensionName}`,
  });
  function dropDescriptionErrorIfNeeded() {
    if (descriptionError && descriptionError.length > 0) {
      setRepoNameError(undefined);
    }
  }
  function dropRepoNameErrorIfNeeded() {
    if (repoNameError && repoNameError.length > 0) {
      setRepoNameError(undefined);
    }
  }
  function dropTitleErrorIfNeeded() {
    if (titleError && titleError.length > 0) {
      setRepoNameError(undefined);
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: Configuration) => {
              setConfig([...configState, values]);
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="description"
        info="Description of this configuration"
        title="Description"
        placeholder="Mute noisy notification"
        error={descriptionError}
        onChange={dropDescriptionErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setDescriptionError("The field should't be empty!");
          } else {
            dropDescriptionErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="repository"
        info="you can use glob pattern"
        defaultValue="*/*"
        title="Repository Name"
        placeholder="raycast/*"
        error={repoNameError}
        onChange={dropRepoNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setRepoNameError("The field should't be empty!");
          } else {
            dropRepoNameErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="title"
        defaultValue="*"
        info="you can use glob pattern"
        title="Title"
        placeholder="Bump typescript *"
        error={titleError}
        onChange={dropTitleErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setTitleError("The field should't be empty!");
          } else {
            dropTitleErrorIfNeeded();
          }
        }}
      />
      <Form.TagPicker
        id="reason"
        title="Reason"
        defaultValue={["*"]}
        info="see https://docs.github.com/en/rest/activity/notifications?apiVersion=2022-11-28"
      >
        <Form.TagPicker.Item value="*" title="*" />
        <Form.TagPicker.Item value="approval_requested" title="approval_requested" />
        <Form.TagPicker.Item value="assign" title="assign" />
        <Form.TagPicker.Item value="author" title="author" />
        <Form.TagPicker.Item value="comment" title="comment" />
        <Form.TagPicker.Item value="ci_activity" title="ci_activity" />
        <Form.TagPicker.Item value="invitation" title="invitation" />
        <Form.TagPicker.Item value="manual" title="manual" />
        <Form.TagPicker.Item value="member_feature_requested" title="member_feature_requested" />
        <Form.TagPicker.Item value="mention" title="mention" />
        <Form.TagPicker.Item value="review_requested" title="review_requested" />
        <Form.TagPicker.Item value="security_alert" title="security_alert" />
        <Form.TagPicker.Item value="security_advisory_credit" title="security_advisory_credit" />
        <Form.TagPicker.Item value="state_change" title="state_change" />
        <Form.TagPicker.Item value="subscribed" title="subscribed" />
        <Form.TagPicker.Item value="team_mention" title="team_mention" />
      </Form.TagPicker>
      <Form.Checkbox id="actOnPrMerged" label="Mark as Read/Done if type:PullRequest is Closed" defaultValue={false} />
    </Form>
  );
}
