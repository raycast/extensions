import {
  ActionPanel,
  closeMainWindow,
  Form,
  FormValue,
  pasteText,
  popToRoot,
  showHUD,
  showToast,
  SubmitFormAction,
  ToastStyle,
} from "@raycast/api";
import { useState } from "react";

import gitmoji, { GitmojiFormat } from "./data/gitmoji";
import formatDescription from "./utils/formatDescription";

export default function Command() {
  const [isBreakingChange, isBreakingChangeSet] = useState(false);

  async function handleSubmit(values: Record<string, FormValue>) {
    if (!values?.ccType) {
      showToast(ToastStyle.Failure, "Type required");
      return;
    }

    if (!values?.ccDescription) {
      showToast(ToastStyle.Failure, "Description required");
      return;
    }

    if (values?.ccBreakingChange && !values?.ccBreakingChangeInfo) {
      showToast(ToastStyle.Failure, "Breaking Info required");
      return;
    }

    const format = (values?.ccFormat || gitmoji?.format).toString();
    const hasEmoji = format.includes("emoji") || false;

    const description = formatDescription({
      format,
      type: values?.ccType ? values?.ccType.toString() : "chore",
      values,
    });

    const body = !values?.ccBody
      ? ""
      : `

${values?.ccBody}`;

    let message = `${description}${body}`;

    if (values?.ccBreakingChange) {
      const identifier = hasEmoji ? "💥️ " : "";
      const title = "BREAKING CHANGE: ";
      const text = values?.ccBreakingChangeInfo;
      const breakingChangeMessage = `${title}${identifier}${text}`;
      message = `${message}

${breakingChangeMessage}`;
    }

    await pasteText(message);
    await showHUD(description);
    await popToRoot();
    await closeMainWindow();
  }

  const { formats, types } = gitmoji;

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="ccType" title="Commit Type">
        {Object.keys(types).map((type) => {
          const { commit, description, emoji } = types[type];
          return <Form.DropdownItem key={commit} value={commit} title={` ${emoji}  ${commit}: ${description}`} />;
        })}
      </Form.Dropdown>
      <Form.TextField id="ccScope" title="Scope" placeholder="Additional contextual information" />
      <Form.TextField id="ccDescription" title="Description" placeholder="Succinct active recap of commit" />
      <Form.TextArea id="ccBody" title="Body" placeholder="More detailed breakdown (if necessary)" />
      <Form.Checkbox
        id="ccBreakingChange"
        title="Breaking Change"
        label="Commit introduces breaking change."
        onChange={isBreakingChangeSet}
        value={isBreakingChange}
      />
      {isBreakingChange && (
        <Form.TextField
          id="ccBreakingChangeInfo"
          title="Breaking Change Info"
          placeholder="Specific breaking call-out"
        />
      )}
      <Form.Dropdown id="ccFormat" title="Format " storeValue>
        {formats.map((format: GitmojiFormat, formatIndex: number) => (
          <Form.DropdownItem key={formatIndex} value={format?.value} title={format?.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
