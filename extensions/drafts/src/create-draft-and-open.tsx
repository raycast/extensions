import { Action, ActionPanel, closeMainWindow, Form, popToRoot, showToast, Toast } from "@raycast/api";
import Style = Toast.Style;
import { CallbackUrl } from "./utils/CallbackUrlUtils";
import { CallbackBasUrls } from "./utils/Defines";
import { checkAppInstallation } from "./utils/ApplicationInstalledCheck";

interface CommandForm {
  content: string;
  tags: string;
}

export default function Command() {
  // app installation check (shows Toast if Drafts is not installed)
  checkAppInstallation();
  async function handleSubmit(values: CommandForm) {
    if (values.content === "") {
      await showToast({
        style: Style.Failure,
        title: "Input Error",
        message: "no content provided",
      });
      return;
    }

    const callbackUrl = new CallbackUrl(CallbackBasUrls.CREATE_DRAFT);
    if (values.tags != "") {
      const tags = values.tags.split(",");
      tags.map((tag) => callbackUrl.addParam({ name: "tag", value: tag }));
    }
    callbackUrl.addParam({ name: "text", value: values.content });
    await callbackUrl.openCallbackUrl();
    await popToRoot({ clearSearchBar: true });
    await closeMainWindow();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create and Open Draft" />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Content" placeholder="Enter content" defaultValue="" autoFocus={true} />
      <Form.TextField id="tags" title="tags" placeholder="Enter comma separated tags" defaultValue="" />
    </Form>
  );
}
