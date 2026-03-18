import { homedir } from "node:os";
import { join } from "node:path";

import { Action, ActionPanel, Form, showInFinder, showToast, Toast, useNavigation } from "@raycast/api";

import { TailscaleClient } from "./clients/tailscale-client";
import { ConflictBehavior, PeerNode, ServiceKind } from "./types";

interface SharedFormProps {
  client: TailscaleClient;
  onSuccess: () => Promise<unknown>;
}

interface SendFilesFormValues {
  files: string[];
  target: string;
}

interface ReceiveFilesFormValues {
  directory: string[];
  conflict: ConflictBehavior;
}

interface ConfigureServiceFormValues {
  target: string;
  path?: string;
}

interface SendFilesFormProps extends SharedFormProps {
  peers: PeerNode[];
}

interface ConfigureServiceFormProps extends SharedFormProps {
  kind: ServiceKind;
}

async function runFormAction(task: () => Promise<void>, successTitle: string, failureTitle: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: successTitle.replace("ed", "ing") });

  try {
    await task();
    toast.style = Toast.Style.Success;
    toast.title = successTitle;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = failureTitle;
    toast.message = error instanceof Error ? error.message : "Unknown error";
    throw error;
  }
}

export function SendFilesForm({ client, onSuccess, peers }: SendFilesFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Send Taildrop Files"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Files"
            onSubmit={async (values: SendFilesFormValues) => {
              await runFormAction(
                () => client.sendFiles(values.target, values.files),
                "Sent Taildrop files",
                "Could Not Send Taildrop Files",
              );
              await onSuccess();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="target"
        title="Peer"
        defaultValue={peers[0] ? peers[0].dnsName || peers[0].hostName : undefined}
        info="Only peers with file sharing available are shown."
      >
        {peers.map((peer) => (
          <Form.Dropdown.Item key={peer.id} value={peer.dnsName || peer.hostName} title={peer.hostName} />
        ))}
      </Form.Dropdown>
      <Form.FilePicker id="files" title="Files" />
    </Form>
  );
}

export function ReceiveFilesForm({ client, onSuccess }: SharedFormProps) {
  const { pop } = useNavigation();
  const defaultDirectory = join(homedir(), "Downloads");

  return (
    <Form
      navigationTitle="Receive Taildrop Files"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Receive Files"
            onSubmit={async (values: ReceiveFilesFormValues) => {
              const directory = values.directory[0] ?? defaultDirectory;
              await runFormAction(
                () => client.receiveFiles(directory, values.conflict),
                "Received Taildrop files",
                "Could Not Receive Taildrop Files",
              );
              await onSuccess();
              await showInFinder(directory);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="directory"
        title="Destination Folder"
        defaultValue={[defaultDirectory]}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.Dropdown id="conflict" title="Conflict Behavior" defaultValue="rename">
        <Form.Dropdown.Item value="rename" title="Rename" />
        <Form.Dropdown.Item value="skip" title="Skip" />
        <Form.Dropdown.Item value="overwrite" title="Overwrite" />
      </Form.Dropdown>
    </Form>
  );
}

export function ConfigureServiceForm({ client, onSuccess, kind }: ConfigureServiceFormProps) {
  const { pop } = useNavigation();
  const label = kind === "serve" ? "Serve" : "Funnel";

  return (
    <Form
      navigationTitle={`Configure ${label}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`Save ${label}`}
            onSubmit={async (values: ConfigureServiceFormValues) => {
              await runFormAction(
                () =>
                  kind === "serve"
                    ? client.configureServe(values.target, values.path)
                    : client.configureFunnel(values.target, values.path),
                `Updated ${label}`,
                `Could Not Update ${label}`,
              );
              await onSuccess();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="target"
        title="Target"
        placeholder="localhost:3000"
        info="Examples: 3000, localhost:3000, http://localhost:3000/app, unix:/tmp/service.sock"
      />
      <Form.TextField
        id="path"
        title="Path"
        placeholder="/"
        info="Optional request path to append when exposing the underlying service."
      />
    </Form>
  );
}
