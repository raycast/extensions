import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import type { FC } from "react";
import { replaceInLine } from "../../utils";

type ReplaceFormProps = {
  path: string;
  line: number;
  content: string;
};

export const ReplaceForm: FC<ReplaceFormProps> = ({ path, line, content }) => {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Replace"
            onSubmit={async (values: { replacement: string }) => {
              try {
                await replaceInLine(path, line, content, values.replacement);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Replaced successfully",
                });
                pop();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to replace",
                  message: error instanceof Error ? error.message : "Unknown error",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="File" text={path} />
      <Form.Description title="Line" text={String(line)} />
      <Form.Description title="Current Match" text={content} />
      <Form.TextField id="replacement" title="Replace With" placeholder="Enter replacement text" />
    </Form>
  );
};
