import { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";
import { connect, keyStores, KeyPair, Contract } from "near-api-js";
import { getNetworkConfig } from "./utils/config";
import { getAvailableAccounts } from "./utils/credentials";

interface FormValues {
  network: string;
  account: string;
  greeting: string;
}

export default function UpdateGreeting() {
  const [accounts, setAccounts] = useState<{ value: string; title: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [contractName, setContractName] = useState("");
  const [formValues, setFormValues] = useState<FormValues>({ network: "", account: "", greeting: "" });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const { networkId, contractName } = await getNetworkConfig();
    setContractName(contractName);
    const availableAccounts = getAvailableAccounts(networkId);

    setAccounts(
      availableAccounts.map((acc) => ({
        value: acc.account_id,
        title: acc.account_id,
      })),
    );
    setIsLoading(false);
  };

  const handleFormChange = (field: keyof FormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (values: FormValues) => {
    try {
      const { nodeUrl, networkId, contractName } = await getNetworkConfig();
      const availableAccounts = getAvailableAccounts(networkId);
      const accountCredentials = availableAccounts.find((acc) => acc.account_id === values.account);

      if (!accountCredentials) {
        throw new Error("Account credentials not found");
      }

      const keyStore = new keyStores.InMemoryKeyStore();
      const keyPair = KeyPair.fromString(accountCredentials.private_key);
      await keyStore.setKey(networkId, values.account, keyPair);

      const near = await connect({ nodeUrl, networkId, keyStore });
      const account = await near.account(values.account);

      interface GreetingContract extends Contract {
        get_greeting(): Promise<string>;
        set_greeting(args: { greeting: string }): Promise<void>;
      }

      const contract = new Contract(account, contractName, {
        viewMethods: ["get_greeting"],
        changeMethods: ["set_greeting"],
        useLocalViewExecution: true,
      }) as GreetingContract;

      await contract.set_greeting({ greeting: values.greeting });

      await showToast({
        style: Toast.Style.Success,
        title: "Greeting Updated",
        message: `New greeting: ${values.greeting}`,
      });
    } catch (error) {
      console.error("Error updating greeting:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to update greeting",
        primaryAction: {
          title: "Retry",
          onAction: () => handleSubmit(values),
        },
      });
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Greeting" onSubmit={handleSubmit} />
          <Action
            title="Copy Near Cli Command"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={() => {
              const cliCommand = `near call ${contractName} set_greeting '{"greeting":"${formValues.greeting}"}' --accountId ${formValues.account || accounts[0]?.value}`;
              Clipboard.copy(cliCommand);
              showToast({
                style: Toast.Style.Success,
                title: "CLI Command Copied",
                message: "Paste it in your terminal to execute",
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="account"
        title="Account"
        info="Select the NEAR account that will be used to update the greeting"
        onChange={(value) => handleFormChange("account", value)}
      >
        {accounts.map((account) => (
          <Form.Dropdown.Item key={account.value} value={account.value} title={account.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="greeting"
        title="New Greeting"
        placeholder="Enter your new greeting"
        info="The new greeting message that will be stored on the NEAR blockchain"
        onChange={(value) => handleFormChange("greeting", value)}
      />
    </Form>
  );
}
