import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, popToRoot } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { createSite, getSites, getUserInfo } from "./api";
import { Item, Preferences, Team } from "./interface";
import { checks } from "./utils/constants";
import { useRef, useState } from "react";

export default function AddSiteCommand() {
  const { data, isLoading } = getUserInfo();
  const { revalidate } = getSites();

  const urlRef = useRef<Form.TextField>(null);
  const nameRef = useRef<Form.TextField>(null);
  const groupRef = useRef<Form.TextField>(null);
  const checksRef = useRef<Form.TextField>(null);
  const submissionPending = useRef(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | undefined>();
  const [checksError, setChecksError] = useState<string | undefined>();

  const urlErrorText = "This field is required!";
  const checkErrorText = "Pick at least one check!";

  async function handleSubmit(item: Item) {
    if (submissionPending.current) {
      return false;
    }

    if (item.url === "") {
      setUrlError(urlErrorText);
      return false;
    }

    if (item.checks.length === 0) {
      setChecksError(checkErrorText);
      return false;
    }

    submissionPending.current = true;
    setIsSubmitting(true);

    try {
      await createSite(item);
      popToRoot();
      revalidate();

      showToast({ style: Toast.Style.Success, title: "Success", message: "Successfully added site" });

      return true;
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Add Site" });
      return false;
    } finally {
      submissionPending.current = false;
      setIsSubmitting(false);
    }
  }

  const preferences = getPreferenceValues<Preferences>();
  const defaultValues = [] as string[];
  checks.forEach((item) => {
    const itemShouldDefault = Object.entries(preferences).find((entry) => {
      return entry[0] === item.value && entry[1] === true;
    });

    if (itemShouldDefault) {
      defaultValues.push(item.value);
    }
  });

  function dropChecksErrorIfNeeded() {
    if (checksError && checksError.length > 0) {
      setChecksError(undefined);
    }
  }

  function dropUrlErrorIfNeeded() {
    if (urlError && urlError.length > 0) {
      setUrlError(undefined);
    }
  }

  return (
    <Form
      isLoading={isLoading || isSubmitting}
      actions={
        !isSubmitting && (
          <ActionPanel>
            <Action.SubmitForm title="Add Site" onSubmit={handleSubmit} />
          </ActionPanel>
        )
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="raycast.com"
        ref={urlRef}
        error={urlError}
        onChange={dropUrlErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setUrlError(urlErrorText);
          } else {
            dropUrlErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="friendly_name"
        placeholder="Optional, leave blank for using the url as name"
        title="Friendly Name"
        ref={nameRef}
      />
      <Form.TextField id="group_name" title="Group" placeholder="Optional group name" ref={groupRef} />
      <Form.Dropdown id="team_id" title="Team">
        {(data?.teams || []).map((team: Team) => (
          <Form.Dropdown.Item key={team.id} value={team.id.toString()} title={team.name} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker
        id="checks"
        title="Checks to Perform"
        ref={checksRef}
        defaultValue={defaultValues}
        error={checksError}
        placeholder="Select at least one check"
        onChange={dropChecksErrorIfNeeded}
        onBlur={(event) => {
          const value = event.target.value;
          if (value && value.length > 0) {
            dropChecksErrorIfNeeded();
          } else {
            setChecksError(checkErrorText);
          }
        }}
      >
        {checks.map((check) => (
          <Form.TagPicker.Item key={check.value} value={check.value} title={check.label} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
