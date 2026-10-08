import { ActionPanel, Action, Form, confirmAlert } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";

export const CastWalletVanity: Command = {
  name: "Generate Vanity Wallet",
  description: "Generate a vanity address",
  component: Command,
};

const Arguments = {
  startsWith: { required: false, name: "Starts With", flag: "--starts-with" },
  endsWith: { required: false, name: "Ends With", flag: "--ends-with" },
  nonce: { required: false, name: "Nonce", flag: "--nonce" },
} as const;

const successMessage = "Copied wallet info to clipboard";
const outputParser = (stdout: string) => stdout.replace("Starting to generate vanity address...", "").replace("\n", "");

export default function Command() {
  const { isLoading, result, execute } = useCast("wallet vanity", Arguments, { successMessage, outputParser });

  async function handleSubmit(v: any) {
    await confirmAlert({
      title: "Warning",
      message:
        "This command might take a long time to complete. Moreover, it will consume the majority of your CPU resources. Are you sure?",
    });

    await execute(v);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-wallet-vanity" />
          <Action.CopyToClipboard title="Copy wallet info to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="startsWith"
        title="Starts With"
        placeholder="dead"
        info="Prefix for the vanity address to generate"
      />
      <Form.TextField
        id="endsWith"
        title="Ends With"
        placeholder="beef"
        info="Suffix for the vanity address to generate"
      />
      <Form.TextField
        id="nonce"
        title="Nonce"
        placeholder="0"
        info="Generate a vanity contract address created by the generated keypair with the specified nonce"
      />
    </Form>
  );
}
