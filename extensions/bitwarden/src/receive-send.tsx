import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchProps,
  Toast,
  closeMainWindow,
  showInFinder,
  showToast,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { ExecaError } from "execa";
import { join } from "path";
import { useEffect, useReducer, useRef } from "react";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { ReceivedFileSend, ReceivedSend, SendType } from "~/types/send";
import { captureException } from "~/utils/development";
import { SendInvalidPasswordError, SendNeedsPasswordError } from "~/utils/errors";
import useOnceEffect from "~/utils/hooks/useOnceEffect";

const LoadingFallback = () => <Form isLoading />;

const ReceiveSendCommand = (props: LaunchProps<{ arguments: Arguments.ReceiveSend }>) => (
  <RootErrorBoundary>
    <BitwardenProvider loadingFallback={<LoadingFallback />}>
      <SessionProvider loadingFallback={<LoadingFallback />} unlock>
        <ReceiveSendCommandContent {...props} />
      </SessionProvider>
    </BitwardenProvider>
  </RootErrorBoundary>
);

type FormValues = {
  url: string;
  password: string;
  filePaths: string[];
};

const initialValues: FormValues = {
  url: "",
  password: "",
  filePaths: [],
};

type State =
  | { status: "idle" }
  | { status: "textRevealed"; sendInfo: ReceivedSend; text: string }
  | { status: "pendingFile"; sendInfo: ReceivedSend }
  | { status: "needsPassword" };

const reducer = (state: State, action: State): State => {
  switch (action.status) {
    case "idle":
      return { status: "idle" };
    case "textRevealed":
      return { status: "textRevealed", sendInfo: action.sendInfo, text: action.text };
    case "pendingFile":
      return { status: "pendingFile", sendInfo: action.sendInfo };
    case "needsPassword":
      return { status: "needsPassword" };
  }
};

function ReceiveSendCommandContent({ arguments: args }: LaunchProps<{ arguments: Arguments.ReceiveSend }>) {
  const bitwarden = useBitwarden();
  const [state, dispatch] = useReducer(reducer, { status: "idle" });

  const passwordFieldRef = useRef<Form.PasswordField>(null);

  const { itemProps, handleSubmit, values, setValue } = useForm<FormValues>({
    initialValues: { ...initialValues, ...args },
    validation: {
      url: FormValidation.Required,
      password: state.status === "needsPassword" ? FormValidation.Required : undefined,
      filePaths: state.status === "pendingFile" ? FormValidation.Required : undefined,
    },
    onSubmit: async (values) => {
      const { url, password, filePaths } = values;
      const [filePath] = filePaths ?? [];

      if (state.status === "idle" || state.status === "needsPassword") {
        await receiveSend(url, password);
      } else if (state.status === "pendingFile" && filePath && state.sendInfo.type === SendType.File) {
        await downloadFile(url, state.sendInfo, filePath);
      } else {
        await showToast({ title: "Failed to receive send", style: Toast.Style.Failure });
      }
    },
  });

  useEffect(() => {
    if (!values.url || values.url === "https://vault.bitwarden.com/#/send/") {
      dispatch({ status: "idle" });
    }
  }, [values]);

  useOnceEffect(() => {
    void handleSubmit({ ...initialValues, ...args });
  }, args.url);

  const receiveSend = async (url: string, password?: string) => {
    const toast = await showToast({ title: "Receiving Send...", style: Toast.Style.Animated });
    try {
      const { result: sendInfo, error } = await bitwarden.receiveSendInfo(url, { password });
      console.log({ error });
      if (error) {
        if (error instanceof SendInvalidPasswordError) {
          toast.style = Toast.Style.Failure;
          toast.title = "Invalid password";
          return;
        }
        if (error instanceof SendNeedsPasswordError) {
          dispatch({ status: "needsPassword" });
          setTimeout(() => passwordFieldRef.current?.focus(), 1);
          return toast.hide();
        }
        throw error;
      }
      if (sendInfo.type === SendType.Text) {
        const { result, error } = await bitwarden.receiveSend(url, { password });
        if (error) throw error;

        dispatch({ status: "textRevealed", sendInfo, text: result });
      } else {
        dispatch({ status: "pendingFile", sendInfo });
      }
      await toast.hide();
    } catch (error) {
      console.log({ error });
      const execaError = error as ExecaError;
      if (execaError && /Not found/i.test(execaError.message)) {
        toast.style = Toast.Style.Failure;
        toast.title = "Send not found";
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to receive Send";
        captureException("Failed to receive Send", error);
      }
    }
  };

  const downloadFile = async (url: string, sendInfo: ReceivedFileSend, filePath: string) => {
    const toast = await showToast({ title: "Downloading file...", style: Toast.Style.Animated });
    try {
      const savePath = join(filePath, sendInfo.file.fileName);
      const { error } = await bitwarden.receiveSend(url, { savePath });
      if (error) throw error;

      toast.title = "File downloaded";
      toast.style = Toast.Style.Success;
      await showInFinder(savePath);
      await closeMainWindow();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to download file";
      captureException("Failed to download file", error);
    }
  };

  const resetFields = () => {
    dispatch({ status: "idle" });
    Object.keys(initialValues).forEach((key) => setValue(key, initialValues[key]));
    passwordFieldRef.current?.focus();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          {state.status === "textRevealed" && <Action.CopyToClipboard content={state.text} title="Copy Text" />}
          {state.status !== "textRevealed" && (
            <Action.SubmitForm
              title={state.status === "pendingFile" ? "Download File" : "Receive Send"}
              icon={{ source: Icon.Download }}
              onSubmit={handleSubmit}
            />
          )}
          {(values.password || values.url) && (
            <Action title="Reset Fields" icon={{ source: Icon.Trash }} onAction={resetFields} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.url} title="Send URL" autoFocus />
      {(state.status === "needsPassword" || args.password) && (
        <Form.PasswordField
          {...itemProps.password}
          ref={passwordFieldRef}
          title="Password"
          info="This Send is password protected"
        />
      )}
      {(state.status === "pendingFile" || state.status === "textRevealed") && (
        <>
          <Form.Separator />
          <Form.Description title="Name" text={state.sendInfo.name} />
          {state.sendInfo.type === SendType.File && (
            <>
              <Form.Description title="File Name" text={state.sendInfo.file.fileName} />
              <Form.Description title="File Size" text={state.sendInfo.file.sizeName} />
            </>
          )}
        </>
      )}
      {state.status === "textRevealed" && (
        <Form.TextArea id="text" title="Text" value={state.text} onChange={() => null} />
      )}
      {state.status === "pendingFile" && (
        <>
          <Form.Description text="" />
          <Form.FilePicker
            {...itemProps.filePaths}
            title="Save File To"
            info="This is the folder to where the Send's file will be saved."
            canChooseFiles={false}
            allowMultipleSelection={false}
            canChooseDirectories
            storeValue
          />
        </>
      )}
    </Form>
  );
}

export default ReceiveSendCommand;
