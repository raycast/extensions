import { Form, ActionPanel, Action, Icon, showToast, Toast, Clipboard, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { SendFormProps } from "../types";
import { validateSolanaAddress, validateTokenAmount, validateFormField } from "../utils/formatters";

export function SendForm({ tokenSymbol, mintAddress, senderAddress, tokenDecimals }: SendFormProps) {
  const navigation = useNavigation();
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [errors] = useState<{
    recipient?: string;
    amount?: string;
  }>({});

  function validateField(fieldName: "recipient" | "amount"): boolean {
    if (fieldName === "recipient") {
      return validateFormField(recipientAddress, validateSolanaAddress, errors, "recipient");
    }
    return validateFormField(
      amount,
      (value) => validateTokenAmount(value, tokenDecimals, tokenSymbol),
      errors,
      "amount",
    );
  }

  function validateAllFields(): boolean {
    const recipientValid = validateField("recipient");
    const amountValid = validateField("amount");
    return recipientValid && amountValid;
  }

  async function handleSubmit() {
    if (!validateAllFields()) {
      await showFailureToast(new Error("Please check the form for errors."), {
        title: "Validation Error",
      });
      return;
    }

    let command: string;
    const numericAmount = parseFloat(amount);

    if (mintAddress) {
      command = `spl-token transfer ${mintAddress} ${numericAmount} ${recipientAddress} --owner ${senderAddress} --allow-unfunded-recipient`;
    } else {
      command = `solana transfer ${recipientAddress} ${numericAmount} --from ${senderAddress}`;
    }

    await Clipboard.copy(command);
    await showToast({
      style: Toast.Style.Success,
      title: "Command Copied!",
      message: `CLI command to send ${amount} ${tokenSymbol} copied to clipboard.`,
    });
    navigation.pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Copy Send ${tokenSymbol} Command`} onSubmit={handleSubmit} icon={Icon.Terminal} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Prepare a CLI command to send ${tokenSymbol}. Paste it into your terminal.`} />
      <Form.TextField
        id="recipientAddress"
        title="Recipient Address"
        placeholder="Enter recipient's Solana address"
        value={recipientAddress}
        error={errors.recipient}
        onChange={setRecipientAddress}
        onBlur={() => validateField("recipient")}
      />
      <Form.TextField
        id="amount"
        title={`Amount (${tokenSymbol})`}
        placeholder={`Enter amount of ${tokenSymbol} to send`}
        value={amount}
        error={errors.amount}
        onChange={setAmount}
        onBlur={() => validateField("amount")}
      />
      <Form.Separator />
      <Form.Description text={`Sender: ${senderAddress}`} />
      {mintAddress && <Form.Description text={`Token: ${tokenSymbol} (Mint: ${mintAddress})`} />}
      <Form.Description text={"Note: Ensure your Solana CLI is configured with the sender's keypair."} />
    </Form>
  );
}
