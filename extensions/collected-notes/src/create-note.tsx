import { Action, ActionPanel, Color, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { useSites } from "./hooks/use-sites";
import { NoteVisibility, cn } from "./utils/collected-notes";
import { useValidation } from "./hooks/use-validation";

export default function Command() {
  const { hasError, isLoading } = useValidation();

  const [titleError, setTitleError] = useState<string | undefined>();

  function dropNameErrorIfNeeded() {
    if (titleError && titleError.length > 0) {
      setTitleError(undefined);
    }
  }

  const { currentSite, sites, sitesAreLoading } = useSites();

  if (hasError && !isLoading) {
    showToast(Toast.Style.Failure, "Error", "Failed to validate credentials");
  }

  return (
    <Form
      enableDrafts
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Note"
            icon={Icon.Pencil}
            onSubmit={async (values) => {
              if (hasError) {
                showToast(Toast.Style.Failure, "Check your credentials before publishing");
                return;
              }

              if (isLoading) {
                showToast(Toast.Style.Animated, "Checking your credentials, please wait...");
                return;
              }

              try {
                await cn.create(
                  {
                    body: `# ${values.title}\n${values.content}`,
                    visibility: values.visibility as NoteVisibility,
                  },
                  values.site_id,
                );
                showToast(Toast.Style.Success, `Note "${values.title}" created`);
                popToRoot();
              } catch (err) {
                showFailureToast("Failed to create note");
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Your post title"
        error={titleError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setTitleError("The field should't be empty!");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
      <Form.Dropdown id="visibility" title="Visibility" defaultValue="public" storeValue={true}>
        <Form.Dropdown.Item
          value="public_site"
          title="Public in Site"
          icon={{
            source: Icon.CircleFilled,
            tintColor: Color.Blue,
          }}
        />
        <Form.Dropdown.Item
          value="public"
          title="Public"
          icon={{
            source: Icon.CircleFilled,
            tintColor: Color.Green,
          }}
        />
        <Form.Dropdown.Item
          value="public_unlisted"
          title="Unlisted"
          icon={{
            source: Icon.CircleFilled,
            tintColor: Color.Yellow,
          }}
        />
        <Form.Dropdown.Item
          value="private"
          title="Private"
          icon={{
            source: Icon.CircleFilled,
            tintColor: Color.Red,
          }}
        />
      </Form.Dropdown>
      <Form.Dropdown
        id="site_id"
        title="Site"
        storeValue={false}
        isLoading={sitesAreLoading}
        defaultValue={currentSite}
      >
        {sites?.map((site) => <Form.Dropdown.Item key={site.id} value={String(site.id)} title={site.name} />)}
      </Form.Dropdown>
      <Form.TextArea id="content" title="Content" placeholder="Your post content" />
    </Form>
  );
}
