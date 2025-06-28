import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";

export default function CertDetailView({ certificate }: { certificate: string }) {
  const { data: execOutput, isLoading: isExecLoading } = useExec("openssl", ["x509", "-text", "-noout"], {
    execute: !!certificate,
    input: certificate || undefined,
    onError: async () => {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to parse certificate",
      });
    },
  });

  const markdownContent = "```\n" + execOutput + "\n```";

  return (
    <Detail
      markdown={markdownContent}
      isLoading={isExecLoading}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Parsed Result" content={markdownContent} />
        </ActionPanel>
      }
    />
  );
}
