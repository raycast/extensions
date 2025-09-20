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
import { useReducer, useRef } from "react";
import { DebuggingBugReportingActionSection } from "~/components/actions";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { ReceivedFileSend, ReceivedSend, SendType } from "~/types/send";
import { Cache } from "~/utils/cache";
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

const cache = {
  setFilePath: (filePath: string) => Cache.set("sendFilePath", filePath),
  getFilePath: () => Cache.get("sendFilePath"),
};

type FormValues = {
  url: string;
  password: string;
  filePaths: string[];
};

const getInitialValues = (args?: Arguments.ReceiveSend): FormValues => {
  const filePath = cache.getFilePath();
  return {
    url: args?.url || "",
    password: args?.password || "",
    filePaths: filePath ? [filePath] : [],
  };
};

type State =
  | { status: "idle" }
  | { status: "textRevealed"; sendInfo: ReceivedSend; text: string }
  | { status: "pendingFile"; sendInfo: ReceivedSend }
  | { status: "needsPassword" };

const stateReducer = (state: State, action: State): State => {
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

const withOnChangeEffect = <T extends Form.Value>(
  itemProps: Partial<Form.ItemProps<T>> & { id: string },
  onChange: (value: T) => void
) => {
  return {
    ...itemProps,
    onChange: (value: T) => {
      itemProps.onChange?.(value);
      onChange(value);
    },
  };
};

function ReceiveSendCommandContent({ arguments: args }: LaunchProps<{ arguments: Arguments.ReceiveSend }>) {
  const bitwarden = useBitwarden();
  const [state, setState] = useReducer(stateReducer, { status: "idle" });

  const urlFieldRef = useRef<Form.TextField>(null);
  const passwordFieldRef = useRef<Form.PasswordField>(null);
  const filePathFieldRef = useRef<Form.FilePicker>(null);

  const { itemProps, handleSubmit, values, reset } = useForm<FormValues>({
    initialValues: getInitialValues(args),
    validation: {
      url: FormValidation.Required,
      password: state.status === "needsPassword" ? FormValidation.Required : undefined,
      filePaths: state.status === "pendingFile" ? FormValidation.Required : undefined,
    },
    onSubmit: async (values) => {
      if (state.status === "idle" || state.status === "needsPassword") {
        await receiveSend(values.url, values.password);
      } else if (state.status === "pendingFile" && values.filePaths[0] && state.sendInfo.type === SendType.File) {
        await downloadFile(values.url, state.sendInfo, values.filePaths[0]);
      } else {
        await showToast({ title: "Failed to receive send", style: Toast.Style.Failure });
      }
    },
  });

  useOnceEffect(() => {
    void handleSubmit(getInitialValues(args));
  }, args.url);

  const receiveSend = async (url: string, password?: string) => {
    const toast = await showToast({ title: "Receiving Send...", style: Toast.Style.Animated });
    try {
      const { result: sendInfo, error } = await bitwarden.receiveSendInfo(url, { password });
      if (error) {
        if (error instanceof SendInvalidPasswordError) {
          toast.style = Toast.Style.Failure;
          toast.title = "Invalid password";
          toast.message = "Please try again";
          return;
        }
        if (error instanceof SendNeedsPasswordError) {
          setState({ status: "needsPassword" });
          setTimeout(() => passwordFieldRef.current?.focus(), 1);
          return toast.hide();
        }
        throw error;
      }
      if (sendInfo.type === SendType.Text) {
        const { result, error } = await bitwarden.receiveSend(url, { password });
        if (error) throw error;

        setState({ status: "textRevealed", sendInfo, text: result });
      } else {
        setState({ status: "pendingFile", sendInfo });
        setTimeout(() => filePathFieldRef.current?.focus(), 1);
      }
      await toast.hide();
    } catch (error) {
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
    reset(getInitialValues());
    setState({ status: "idle" });
    urlFieldRef.current?.focus();
  };

  const onUrlChange = (url: string) => {
    if (!url || url === "https://vault.bitwarden.com/#/send/") {
      resetFields();
    }
  };

  const onFilePathsChange = (paths: string[]) => {
    const [filePath] = paths ?? [];
    if (filePath) {
      cache.setFilePath(filePath);
    }
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
          <DebuggingBugReportingActionSection />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...withOnChangeEffect(itemProps.url, onUrlChange)}
        ref={urlFieldRef}
        title="Send URL"
        autoFocus
      />
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
            {...withOnChangeEffect(itemProps.filePaths, onFilePathsChange)}
            ref={filePathFieldRef}
            title="Save File To"
            info="This is the folder to where the Send's file will be saved."
            canChooseFiles={false}
            allowMultipleSelection={false}
            canChooseDirectories
          />
        </>
      )}
    </Form>
  );
}

export default ReceiveSendCommand;
