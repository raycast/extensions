import { Action, ActionPanel, Form, Icon, Toast, open, showToast } from "@raycast/api";
import { MissingMint } from "./missing-mint";
import { useMintCLI } from "./use-mint-cli";

type FullRedactForm = { source: string[] };

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;

  return (
    <Form
      navigationTitle="Full Redact in Mint"
      actions={
        <ActionPanel>
          <Action.SubmitForm<FullRedactForm>
            title="Open in Mint Redact"
            icon={Icon.AppWindow}
            onSubmit={async (values) => {
              const sourcePath = values.source[0];
              if (!sourcePath) {
                await showToast({ style: Toast.Style.Failure, title: "Choose a PDF or image" });
                return;
              }
              const target = new URL("mint://redact");
              target.searchParams.set("path", sourcePath);
              await open(target.toString());
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="source" title="PDF or Image" allowMultipleSelection={false} canChooseDirectories={false} />
      <Form.Description text="Full Redact opens Mint's visual editor for page-by-page review, custom blocks, before/after comparison, and content-preserving PDF export." />
    </Form>
  );
}
