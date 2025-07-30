import { Detail, ActionPanel, Action } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";

export default function CertDetailView({ certificate }: { certificate: string }) {
  const { data: execOutput, isLoading: isExecLoading } = useExec("openssl", ["x509", "-text", "-noout"], {
    execute: !!certificate,
    input: certificate || undefined,
    onError: async (error) => {
      await showFailureToast(error, { title: "Failed to parse certificate" });
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
