import { Form, ActionPanel, Action, showToast, Toast, Clipboard, Icon } from "@raycast/api";
import { useState } from "react";
import { generatePassword } from "./api";
import { ACTION_TITLES, ERROR_MESSAGES, IN_PROGRESS_MESSAGES, SUCCESS_MESSAGES } from "./lib/constants";
import { useForm } from "@raycast/utils";
import { Error } from "./components/Error";
import CommonActions from "./components/CommonActions";
import { isCanceledError } from "./lib/helpers";

interface FormValues {
  length: string;
  includeSymbols: boolean;
  includeDigits: boolean;
  includeUppercase: boolean;
  includeLowercase: boolean;
}

const DEFAULT_PASSWORD_LENGTH = "20";

export default function GeneratePassword() {
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      length: DEFAULT_PASSWORD_LENGTH,
      includeSymbols: true,
      includeDigits: true,
      includeUppercase: true,
      includeLowercase: true,
    },
    onSubmit: async (values: FormValues) => {
      setError(null);
      setIsLoading(true);
      setPassword("");

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: IN_PROGRESS_MESSAGES.GENERATING_PASSWORD_TITLE,
        message: IN_PROGRESS_MESSAGES.PLEASE_WAIT_A_MOMENT,
      });

      try {
        // Build command based on user preferences
        const command = [];

        if (!values.includeSymbols) command.push("-s=0");
        if (!values.includeDigits) command.push("-d=0");
        if (!values.includeUppercase) command.push("-u=0");
        if (!values.includeLowercase) command.push("-l=0");

        if (command.length === 4) {
          toast.style = Toast.Style.Failure;
          toast.title = ERROR_MESSAGES.TITLE_GENERATE_PASSWORD_UNSECELECTED_OPTIONS;
          toast.message = ERROR_MESSAGES.MESSAGE_GENERATE_PASSWORD_UNSECELECTED_OPTIONS;
          return;
        }

        command.push(`-c=${values.length}`);

        const response = await generatePassword(command);
        const responseData = response?.data?.data ?? [];
        const generatedPassword = responseData[0]?.password;

        if (!generatedPassword) {
          toast.style = Toast.Style.Failure;
          toast.title = ERROR_MESSAGES.GENERATE_PASSWORD_FAILED;
          toast.message = "";
          return;
        }

        setPassword(generatedPassword);
        await Clipboard.copy(generatedPassword, { concealed: true });

        toast.style = Toast.Style.Success;
        toast.title = SUCCESS_MESSAGES.PASSWORD_COPIED;
        toast.message = "";
      } catch (error) {
        if (isCanceledError(error as Error)) {
          return;
        }

        toast.hide();

        setError(error);
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      length: (value: string | undefined) => {
        if (!value || value.trim() === "") {
          return ERROR_MESSAGES.PASSWORD_LENGTH_REQUIRED;
        }
        const num = parseInt(value);
        if (isNaN(num) || !/^\d+$/.test(value) || num < 20 || num > 99) {
          return ERROR_MESSAGES.PASSWORD_LENGTH_MUST_BE_A_NUMBER;
        }
        return undefined;
      },
    },
  });

  if (error) {
    return <Error error={error} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={ACTION_TITLES.GENERATE_PASSWORD} onSubmit={handleSubmit} icon={Icon.Key} />
          {password && (
            <Action
              title={ACTION_TITLES.COPY_PASSWORD}
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(password);
                await showToast({
                  style: Toast.Style.Success,
                  title: SUCCESS_MESSAGES.PASSWORD_COPIED,
                });
              }}
            />
          )}
          <CommonActions />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField {...itemProps.length} id="length" title="Password Length" />

      {[
        {
          id: "includeSymbols",
          title: "Include Symbols",
          label: "Include special characters (!@#$%^&*)",
          defaultValue: true,
        },
        {
          id: "includeDigits",
          title: "Include Digits",
          label: "Include numbers (0-9)",
          defaultValue: true,
        },
        {
          id: "includeUppercase",
          title: "Include Uppercase",
          label: "Include uppercase letters (A-Z)",
          defaultValue: true,
        },
        {
          id: "includeLowercase",
          title: "Include Lowercase",
          label: "Include lowercase letters (a-z)",
          defaultValue: true,
        },
      ].map((field) => (
        <Form.Checkbox
          key={field.id}
          id={field.id}
          title={field.title}
          label={field.label}
          defaultValue={field.defaultValue}
        />
      ))}

      {password && (
        <>
          <Form.Separator />
          <Form.Description key={"generatedPass"} text={password} title="Generated Password" />
        </>
      )}
    </Form>
  );
}
