import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { type DecodedTransaction, decodeTransaction } from "./lib/bitcoin";

const MAX_SCRIPT_DISPLAY_LENGTH = 1_200;

function truncate(value: string): string {
  return value.length > MAX_SCRIPT_DISPLAY_LENGTH
    ? `${value.slice(0, MAX_SCRIPT_DISPLAY_LENGTH)}… (${value.length - MAX_SCRIPT_DISPLAY_LENGTH} more characters)`
    : value || "(empty)";
}

function transactionMarkdown(transaction: DecodedTransaction): string {
  const inputs = transaction.inputs
    .map(
      (input) => `### Input ${input.index}

- **Source:** \`${input.sourceTransactionId}:${input.sourceOutputIndex}\`
- **Sequence:** \`${input.sequence}\`

\`\`\`text
${truncate(input.unlockingScriptAsm)}
\`\`\``,
    )
    .join("\n\n");

  const outputs = transaction.outputs
    .map(
      (output) => `### Output ${output.index}

- **Value:** ${output.satoshis.toLocaleString("en-US")} satoshis

\`\`\`text
${truncate(output.lockingScriptAsm)}
\`\`\``,
    )
    .join("\n\n");

  return `# Transaction

**TXID:** \`${transaction.transactionId}\`

| Field | Value |
| --- | ---: |
| Version | ${transaction.version} |
| Size | ${transaction.sizeBytes.toLocaleString("en-US")} bytes |
| Inputs | ${transaction.inputs.length} |
| Outputs | ${transaction.outputs.length} |
| Total Output | ${transaction.totalOutputSatoshis.toLocaleString("en-US")} satoshis |
| Lock Time | ${transaction.lockTime} |

## Inputs

${inputs || "No inputs"}

## Outputs

${outputs || "No outputs"}`;
}

function TransactionDetail({
  transaction,
}: {
  transaction: DecodedTransaction;
}) {
  const json = JSON.stringify(transaction, null, 2);

  return (
    <Detail
      markdown={transactionMarkdown(transaction)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Transaction ID"
            content={transaction.transactionId}
          />
          <Action.CopyToClipboard
            title="Copy Decoded JSON"
            content={json}
            shortcut={{ modifiers: ["cmd"], key: "j" }}
          />
          <Action.CopyToClipboard
            title="Copy Raw Transaction"
            content={transaction.rawTransaction}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  const { handleSubmit, itemProps, setValidationError } = useForm<{
    rawTransaction: string;
  }>({
    validation: {
      rawTransaction: FormValidation.Required,
    },
    onSubmit(values) {
      try {
        const transaction = decodeTransaction(values.rawTransaction);
        push(<TransactionDetail transaction={transaction} />);
      } catch (submitError) {
        setValidationError(
          "rawTransaction",
          submitError instanceof Error
            ? submitError.message
            : "Enter a valid raw transaction.",
        );
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Decode Transaction"
            icon={Icon.Code}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Raw Transaction"
        placeholder="Paste hexadecimal transaction data"
        autoFocus
        {...itemProps.rawTransaction}
      />
    </Form>
  );
}
