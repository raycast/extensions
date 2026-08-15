import { ActionPanel, Action, Icon, showToast, Toast, Clipboard, Form, useNavigation } from "@raycast/api";
import { formatSQL } from "./utils";
import { useForm } from "@raycast/utils";
import { FormattedSqlDetail } from "./formatSqlDetail";

/**
 * Form input interface for SQL formatting
 */
interface FormInput {
  input: string;
  action: "format" | "view";
}

/**
 * Main command component for SQL formatting
 * Provides a form interface for SQL input and formatting options
 */
export default function PreviewFormat() {
  const { push } = useNavigation();
  const { values, itemProps, handleSubmit } = useForm<FormInput>({
    /**
     * Handle form submission
     * Formats SQL and either copies to clipboard or shows preview
     */
    onSubmit: async ({ input, action }) => {
      try {
        const output = (await formatSQL(input)) || "";
        if (output) {
          if (action === "format") {
            await Clipboard.copy(output);
            await showToast({
              style: Toast.Style.Success,
              title: "Copied to Clipboard",
            });
          } else {
            push(<FormattedSqlDetail sql={output} />);
          }
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Format Failed",
          message: error instanceof Error ? error.message : "Unknown Error",
        });
      }
    },
    initialValues: { input: "" },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Format"
            icon={Icon.Clipboard}
            onSubmit={() => handleSubmit({ ...values, action: "format" })}
          />
          <Action.SubmitForm
            title="View Result"
            icon={Icon.Eye}
            onSubmit={() => handleSubmit({ ...values, action: "view" })}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea title="SQL Statement" placeholder="Enter SQL statement to format" {...itemProps.input} />
      <Form.Description text="Press Command + Shift + Enter to view result." />
    </Form>
  );
}
