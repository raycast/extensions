import { Action, ActionPanel, Form, showToast, Toast, useNavigation, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { getNetworkConfig } from "./utils/config";
import { connect, Contract } from "near-api-js";
import { getCredentials, getAvailableAccounts } from "./utils/credentials";

interface Web4Contract extends Contract {
  add_app(args: { app: Web4App }): Promise<void>;
  update_app(args: { app: Web4App }): Promise<void>;
}

interface Web4App {
  title: string;
  dapp_account_id: string;
  categories: string[];
  slug: string;
  oneliner: string;
  description: string;
  logo_url: string;
  github?: string;
  twitter?: string;
  medium?: string;
  discord?: string;
  facebook?: string;
  telegram?: string;
  symbol?: string;
  token_address?: string;
}

const CATEGORIES = [
  { value: "0", title: "Games", slug: "games" },
  { value: "1", title: "NFT", slug: "nft" },
  { value: "2", title: "DeFi", slug: "defi" },
  { value: "3", title: "Social", slug: "social" },
  { value: "4", title: "Development", slug: "development" },
];

const METHODS = [
  { value: "add_app", title: "Add New App" },
  { value: "update_app", title: "Update Existing App" },
];

export default function Command() {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<{ value: string; title: string }[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [contractAddress, setContractAddress] = useState("");

  useEffect(() => {
    async function loadConfig() {
      const { networkId } = await getNetworkConfig();
      setContractAddress(networkId === "mainnet" ? "awesomeweb4.near" : "awesomeweb4.testnet");
    }
    loadConfig();
  }, []);

  const handleFormChange = (field: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    async function loadAccounts() {
      const { networkId } = await getNetworkConfig();
      const availableAccounts = getAvailableAccounts(networkId);
      setAccounts(
        availableAccounts.map((acc) => ({
          value: acc.account_id,
          title: acc.account_id,
        })),
      );
    }
    loadAccounts();
  }, []);

  async function handleSubmit(values: Record<string, string>) {
    try {
      setIsSubmitting(true);
      const credentials = await getCredentials();
      if (!credentials) {
        showToast({
          style: Toast.Style.Failure,
          title: "No credentials found",
          message: "Please login with NEAR CLI first",
        });
        return;
      }

      const { nodeUrl, networkId } = await getNetworkConfig();
      const near = await connect({ nodeUrl, networkId });
      const contractAddress = networkId === "mainnet" ? "awesomeweb4.near" : "awesomeweb4.testnet";
      const account = await near.account(credentials.account_id);

      const contract = new Contract(account, contractAddress, {
        viewMethods: ["get_apps"],
        changeMethods: ["add_app", "update_app"],
        useLocalViewExecution: true,
      }) as Web4Contract;

      const app: Web4App = {
        title: values.title,
        dapp_account_id: values.account || credentials.account_id,
        categories: [values.category],
        slug: values.slug,
        oneliner: values.oneliner,
        description: values.description,
        logo_url: values.logo_url,
        github: values.github || undefined,
        twitter: values.twitter || undefined,
        medium: values.medium || undefined,
        discord: values.discord || undefined,
        facebook: values.facebook || undefined,
        telegram: values.telegram || undefined,
        symbol: values.symbol || undefined,
        token_address: values.token_address || undefined,
      };

      const method = values.method === "add_app" ? "add_app" : "update_app";
      await contract[method]({ app });

      showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `App ${method === "add_app" ? "added" : "updated"} successfully`,
      });

      pop();
    } catch (error) {
      console.error("Error submitting app:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to submit app",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
          <Action
            title="Copy Near Cli Command"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={() => {
              const cliCommand = `near call ${contractAddress} add_app '{"app":{"title":"${formValues.title}","dapp_account_id":"${formValues.account}","categories":["${formValues.category}"],"slug":"${formValues.slug}","oneliner":"${formValues.oneliner}","description":"${formValues.description}","logo_url":"${formValues.logo_url}"${formValues.github ? `,"github":"${formValues.github}"` : ""}${formValues.twitter ? `,"twitter":"${formValues.twitter}"` : ""}${formValues.medium ? `,"medium":"${formValues.medium}"` : ""}${formValues.discord ? `,"discord":"${formValues.discord}"` : ""}${formValues.facebook ? `,"facebook":"${formValues.facebook}"` : ""}${formValues.telegram ? `,"telegram":"${formValues.telegram}"` : ""}${formValues.symbol ? `,"symbol":"${formValues.symbol}"` : ""}${formValues.token_address ? `,"token_address":"${formValues.token_address}"` : ""}}}' --accountId ${formValues.account} --deposit 0.1`;
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
      <Form.Dropdown id="method" title="Method" defaultValue="add_app">
        {METHODS.map((method) => (
          <Form.Dropdown.Item key={method.value} value={method.value} title={method.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="account"
        title="Account"
        info="Select the NEAR account that will be used to submit the app"
        onChange={(value) => handleFormChange("account", value)}
      >
        {accounts.map((account) => (
          <Form.Dropdown.Item key={account.value} value={account.value} title={account.title} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="title"
        title="App Title"
        placeholder="Enter your app title"
        onChange={(value) => handleFormChange("title", value)}
      />

      <Form.TextField
        id="slug"
        title="App Slug"
        placeholder="Enter a unique identifier for your app"
        onChange={(value) => handleFormChange("slug", value)}
      />

      <Form.Dropdown
        id="category"
        title="Category"
        defaultValue="4"
        onChange={(value) => handleFormChange("category", value)}
      >
        {CATEGORIES.map((category) => (
          <Form.Dropdown.Item key={category.value} value={category.value} title={category.title} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="oneliner"
        title="One-liner"
        placeholder="Brief description of your app"
        onChange={(value) => handleFormChange("oneliner", value)}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Detailed description of your app"
        onChange={(value) => handleFormChange("description", value)}
      />

      <Form.TextField
        id="logo_url"
        title="Logo URL"
        placeholder="URL to your app's logo"
        onChange={(value) => handleFormChange("logo_url", value)}
      />

      <Form.TextField
        id="github"
        title="GitHub"
        placeholder="Your GitHub username or repository URL"
        onChange={(value) => handleFormChange("github", value)}
      />

      <Form.TextField
        id="twitter"
        title="Twitter"
        placeholder="Your Twitter handle"
        onChange={(value) => handleFormChange("twitter", value)}
      />

      <Form.TextField
        id="medium"
        title="Medium"
        placeholder="Your Medium username"
        onChange={(value) => handleFormChange("medium", value)}
      />

      <Form.TextField
        id="discord"
        title="Discord"
        placeholder="Discord server invite link"
        onChange={(value) => handleFormChange("discord", value)}
      />

      <Form.TextField
        id="facebook"
        title="Facebook"
        placeholder="Facebook page URL"
        onChange={(value) => handleFormChange("facebook", value)}
      />

      <Form.TextField
        id="telegram"
        title="Telegram"
        placeholder="Telegram group or channel link"
        onChange={(value) => handleFormChange("telegram", value)}
      />

      <Form.TextField
        id="symbol"
        title="Symbol"
        placeholder="Token symbol (if applicable)"
        onChange={(value) => handleFormChange("symbol", value)}
      />

      <Form.TextField
        id="token_address"
        title="Token Address"
        placeholder="Token contract address (if applicable)"
        onChange={(value) => handleFormChange("token_address", value)}
      />

      <Form.Description
        title="Note"
        text="Submitting an app requires a deposit of 0.1 NEAR. The dapp_account_id will be set to the selected account."
      />
    </Form>
  );
}
