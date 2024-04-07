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
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { ExecaError } from "execa";
import { join } from "path";
import { useEffect, useReducer } from "react";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { ReceivedSend, SendType } from "~/types/send";
import { captureException } from "~/utils/development";
import { SendNeedsPasswordError } from "~/utils/errors";
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
};

const initialValues: FormValues = {
  url: "",
  password: "",
};

type SendInfo = ReceivedSend & { url: string };

const getSendInfoDescription = (sendInfo: SendInfo) => {
  let text = `Name: ${sendInfo.name}\n`;
  if (sendInfo.type === SendType.File) {
    text += `File: ${sendInfo.file.fileName}\n`;
    text += `Size: ${sendInfo.file.sizeName}\n`;
  }
  return text;
};

type ReducerState =
  | { status: "idle" }
  | { status: "textRevealed"; text: string }
  | { status: "pendingFile"; sendInfo: SendInfo }
  | { status: "needsPassword" };

const reducer = (state: ReducerState, action: ReducerState): ReducerState => {
  switch (action.status) {
    case "idle":
      return { status: "idle" };
    case "textRevealed":
      return { status: "textRevealed", text: action.text };
    case "pendingFile":
      return { status: "pendingFile", sendInfo: action.sendInfo };
    case "needsPassword":
      return { status: "needsPassword" };
  }
};

function ReceiveSendCommandContent({ arguments: args }: LaunchProps<{ arguments: Arguments.ReceiveSend }>) {
  const bitwarden = useBitwarden();
  const [state, dispatch] = useReducer(reducer, { status: "idle" });
  const [filePath, setFilePath] = useCachedState<string>("receiveSendFilePath", "~/Downloads");

  const { itemProps, handleSubmit, values } = useForm<FormValues>({
    onSubmit,
    initialValues: { ...initialValues, ...args },
    validation: {
      url: FormValidation.Required,
      password: state.status === "needsPassword" ? FormValidation.Required : undefined,
    },
  });

  useEffect(() => {
    if (!values.url) dispatch({ status: "idle" });
  }, [values]);

  useOnceEffect(() => {
    void handleSubmit(args);
  }, args.url);

  async function onSubmit({ url, password }: FormValues) {
    const toast = await showToast({ title: "Receiving Send...", style: Toast.Style.Animated });
    try {
      const { result: sendInfo, error } = await bitwarden.receiveSendInfo(url, { password });
      if (error) {
        if (error instanceof SendNeedsPasswordError) {
          dispatch({ status: "needsPassword" });
          return toast.hide();
        }
        throw error;
      }
      if (sendInfo.type === SendType.Text) {
        const { result, error } = await bitwarden.receiveSend(url, { password });
        if (error) throw error;
        dispatch({ status: "textRevealed", text: result });
      } else {
        dispatch({ status: "pendingFile", sendInfo: { ...sendInfo, url } });
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
  }

  const downloadFile = async () => {
    if (state.status === "pendingFile" && state.sendInfo.type === SendType.File) {
      const { sendInfo } = state;
      const toast = await showToast({ title: "Downloading file...", style: Toast.Style.Animated });
      try {
        const savePath = join(filePath, sendInfo.file.fileName);
        const { error } = await bitwarden.receiveSend(sendInfo.url, { savePath });
        if (error) throw error;
        await showInFinder(savePath);
        await toast.hide();
        await closeMainWindow();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to download file";
        captureException("Failed to download file", error);
      }
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          {state.status === "textRevealed" && <Action.CopyToClipboard content={state.text} title="Copy Text" />}
          {state.status === "pendingFile" && (
            <Action.SubmitForm title="Download File" icon={{ source: Icon.Download }} onSubmit={downloadFile} />
          )}
          {(state.status === "idle" || state.status === "needsPassword") && (
            <Action.SubmitForm title="Receive Send" icon={{ source: Icon.Download }} onSubmit={handleSubmit} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.url} title="Send URL" autoFocus />
      {(state.status === "needsPassword" || args.password) && (
        <Form.PasswordField {...itemProps.password} title="Password" info="This Send is password protected" />
      )}
      {state.status === "pendingFile" && (
        <Form.Description title="Details" text={getSendInfoDescription(state.sendInfo)} />
      )}
      {state.status === "textRevealed" && (
        <Form.TextArea id="text" title="Text" value={state.text} onChange={() => null} />
      )}
      {state.status === "pendingFile" && (
        <Form.FilePicker
          id="filePath"
          title="File Save Path"
          info="This Send contains a file, this is the path where it will be saved."
          value={filePath ? [filePath] : []}
          onChange={([path]) => path && setFilePath(path)}
          canChooseFiles={false}
          allowMultipleSelection={false}
          canChooseDirectories
        />
      )}
    </Form>
  );
}

export default ReceiveSendCommand;
