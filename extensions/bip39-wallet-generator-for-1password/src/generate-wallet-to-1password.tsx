import {
  Action,
  ActionPanel,
  Detail,
  environment,
  Form,
  Icon,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";

import { GeneratedWalletDetail } from "./generated-wallet-detail";
import {
  AuthenticationRequiredError,
  getCliPath,
  isSignedIn,
  listVaults,
  saveWallet,
  signIn,
} from "./one-password";
import { addressCardDataUri } from "./phrase-card";
import type { SavedItem, WalletResult } from "./types";

interface FormValues {
  title: string;
  vaultId: string;
}

function defaultItemTitle(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `Wallet Seed ${now.getFullYear()}-${month}-${day} ${hour}:${minute}`;
}

function ResultView({
  result,
  saved,
}: {
  result: WalletResult;
  saved: SavedItem;
}) {
  const addresses = addressCardDataUri(result.chains, environment.appearance);
  const markdown = `# Saved to 1Password

**${saved.title}** · **${saved.vault}** vault

The recovery phrase is stored in a concealed field and is not shown here.

![Public addresses](${addresses})`;

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.Open
            title="Open in 1Password"
            target={`onepassword://view-item/?i=${saved.id}`}
          />
          <ActionPanel.Section title="Public Addresses">
            <Action.CopyToClipboard
              content={result.chains.btc.address}
              shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
              title="Copy BTC Address"
            />
            <Action.CopyToClipboard
              content={result.chains.evm.address}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              title="Copy ETH Address"
            />
            <Action.CopyToClipboard
              content={result.chains.sol.address}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              title="Copy SOL Address"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      markdown={markdown}
    />
  );
}

function SaveWalletForm({ result }: { result: WalletResult }) {
  const { push } = useNavigation();
  const isSubmitting = useRef(false);

  const {
    data: vaults,
    error: setupError,
    isLoading: isLoadingVaults,
    revalidate,
  } = useCachedPromise(
    async () => {
      getCliPath();
      if (!(await isSignedIn())) {
        await signIn();
      }
      return listVaults();
    },
    [],
    // The setup-error screen below is the single error surface; suppress the
    // hook's own generic failure toast.
    { keepPreviousData: true, onError: () => {} },
  );

  async function submit(values: FormValues) {
    if (isSubmitting.current) return;
    if (!values.vaultId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select a 1Password vault first",
        message: "Wait for the vault list to finish loading.",
      });
      return;
    }

    isSubmitting.current = true;
    const title = values.title.trim() || defaultItemTitle();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving recovery phrase to 1Password…",
    });
    try {
      let saved: SavedItem;
      try {
        saved = await saveWallet(result, title, values.vaultId);
      } catch (error) {
        if (
          !(error instanceof AuthenticationRequiredError) ||
          /prompt dismissed/i.test(error.message)
        ) {
          throw error;
        }
        toast.title = "Waiting for 1Password authorization…";
        await signIn();
        toast.title = "Saving recovery phrase to 1Password…";
        saved = await saveWallet(result, title, values.vaultId);
      }
      toast.style = Toast.Style.Success;
      toast.title = "Wallet saved to 1Password";
      push(<ResultView result={result} saved={saved} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Wallet was not saved";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      isSubmitting.current = false;
    }
  }

  if (setupError) {
    const message = setupError.message;
    const cliMissing = message.includes("CLI") || message.includes("not found");
    return (
      <Detail
        isLoading={isLoadingVaults}
        actions={
          <ActionPanel>
            <Action icon={Icon.Repeat} onAction={revalidate} title="Retry" />
            {cliMissing ? (
              <Action
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
                title="Open Extension Preferences"
              />
            ) : (
              <Action
                icon={Icon.Gear}
                onAction={() => open("onepassword://settings")}
                title="Open 1Password Settings"
              />
            )}
          </ActionPanel>
        }
        markdown={`# 1Password setup required

${message}

Install the 1Password CLI and enable **1Password → Settings → Developer → Connect with 1Password CLI**, then retry.`}
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Wallet}
            onSubmit={submit}
            title="Save to 1Password"
          />
        </ActionPanel>
      }
      isLoading={isLoadingVaults}
    >
      <Form.Description text="The recovery phrase shown on the previous screen will be saved directly to 1Password." />
      <Form.TextField
        defaultValue={defaultItemTitle()}
        id="title"
        placeholder={defaultItemTitle()}
        title="Item Title"
      />
      <Form.Dropdown id="vaultId" storeValue title="1Password Vault">
        {(vaults ?? []).map((vault) => (
          <Form.Dropdown.Item
            key={vault.id}
            title={vault.name}
            value={vault.id}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function Command() {
  const { push } = useNavigation();

  return (
    <GeneratedWalletDetail
      onRecoveryPhraseAction={(result) => (
        <Action
          icon={Icon.Lock}
          onAction={() => push(<SaveWalletForm result={result} />)}
          title="Save to 1Password"
        />
      )}
    />
  );
}
