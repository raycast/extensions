import {
  List,
  Detail,
  ActionPanel,
  Action,
  Icon,
  Form,
  showToast,
  Toast,
  Clipboard,
  useNavigation,
  LocalStorage,
} from "@raycast/api";
import { useSolanaBalance, useSplTokenBalances } from "./helpers";
import { useState, useEffect } from "react";

const USER_WALLET_ADDRESS_KEY = "userSolanaWalletAddress";

function formatTokenBalance(balance: number, decimals: number): string {
  return balance.toFixed(Math.min(decimals, 6));
}

interface SendFormProps {
  tokenSymbol: string;
  tokenDecimals: number;
  mintAddress?: string;
  senderAddress: string;
}

function SendForm({ tokenSymbol, mintAddress, senderAddress, tokenDecimals }: SendFormProps) {
  const navigation = useNavigation();
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [errors, setErrors] = useState<{ recipient?: string; amount?: string }>({});

  function validateField(fieldName: "recipient" | "amount"): boolean {
    let isValid = true;
    const newErrors = { ...errors };

    if (fieldName === "recipient") {
      if (!recipientAddress) {
        newErrors.recipient = "Recipient address is required.";
        isValid = false;
      } else if (recipientAddress.length < 32 || recipientAddress.length > 44) {
        newErrors.recipient = "Invalid address length (must be 32-44 chars).";
        isValid = false;
      } else if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(recipientAddress)) {
        newErrors.recipient = "Address contains invalid Base58 characters.";
        isValid = false;
      } else {
        delete newErrors.recipient;
      }
    }

    if (fieldName === "amount") {
      if (!amount) {
        newErrors.amount = "Amount is required.";
        isValid = false;
      } else {
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
          newErrors.amount = "Amount must be a positive number.";
          isValid = false;
        } else {
          const parts = amount.split(".");
          if (parts.length > 1 && parts[1].length > tokenDecimals) {
            newErrors.amount = `Amount cannot have more than ${tokenDecimals} decimal places for ${tokenSymbol}.`;
            isValid = false;
          } else {
            delete newErrors.amount;
          }
        }
      }
    }
    setErrors(newErrors);
    return isValid;
  }

  function validateAllFields(): boolean {
    const recipientValid = validateField("recipient");
    const amountValid = validateField("amount");
    return recipientValid && amountValid;
  }

  async function handleSubmit() {
    if (!validateAllFields()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Please check the form for errors.",
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

interface WalletSetupFormProps {
  onWalletSet: (address: string) => void;
}

function WalletSetupForm({ onWalletSet }: WalletSetupFormProps) {
  const [address, setAddress] = useState<string>("");
  const [error, setError] = useState<string | undefined>(undefined);

  async function handleSubmit() {
    if (!address) {
      setError("Wallet address is required.");
      return;
    }
    if (address.length < 32 || address.length > 44) {
      setError("Invalid address length (must be 32-44 chars).");
      return;
    }
    if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) {
      setError("Address contains invalid Base58 characters.");
      return;
    }
    setError(undefined);

    await LocalStorage.setItem(USER_WALLET_ADDRESS_KEY, address);
    await showToast({
      style: Toast.Style.Success,
      title: "Wallet Address Saved",
      message: "Your Solana wallet address has been stored.",
    });
    onWalletSet(address);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Wallet Address" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter your Solana public wallet address to check balances and prepare transactions." />
      <Form.TextField
        id="walletAddress"
        title="Solana Wallet Address"
        placeholder="Enter public wallet address"
        value={address}
        error={error}
        onChange={setAddress}
        onBlur={() => {
          if (!address) setError("Wallet address is required.");
          else if (address.length > 0 && (address.length < 32 || address.length > 44))
            setError("Invalid address length (32-44 chars).");
          else if (address.length > 0 && !/^[1-9A-HJ-NP-Za-km-z]+$/.test(address))
            setError("Invalid Base58 characters.");
          else setError(undefined);
        }}
      />
    </Form>
  );
}

interface BalancesViewProps {
  walletAddress: string;
  onChangeWallet: () => Promise<void>;
}

function BalancesView({ walletAddress, onChangeWallet }: BalancesViewProps) {
  const { balance: solBalance, isLoading: isLoadingSol, error: errorSol } = useSolanaBalance(walletAddress);
  const { tokenBalances, isLoading: isLoadingTokens, error: errorTokens } = useSplTokenBalances(walletAddress);

  const isLoading = isLoadingSol || isLoadingTokens;
  const combinedError = errorSol || errorTokens;

  if (combinedError) {
    const errorMessage =
      typeof combinedError === "string" ? combinedError : (combinedError as Error).message || "Unknown error";
    return <Detail markdown={`# Error\n\nCould not fetch balances: ${errorMessage}`} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tokens...">
      <List.Section title="Native Balance (SOL)">
        {solBalance !== null && (
          <List.Item
            title="SOL"
            subtitle="Solana"
            accessories={[{ text: `${formatTokenBalance(solBalance, 9)} SOL` }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Balance" content={solBalance.toString()} />
                <Action.CopyToClipboard title="Copy Wallet Address" content={walletAddress} />
                <Action.Push
                  title="Send Sol"
                  icon={Icon.Upload}
                  target={<SendForm tokenSymbol="SOL" senderAddress={walletAddress} tokenDecimals={9} />}
                />
                <Action
                  title="Change Wallet Address"
                  icon={Icon.Switch}
                  onAction={onChangeWallet}
                  shortcut={{ modifiers: ["cmd"], key: "w" }}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title="Token Balances">
        {tokenBalances.map((token) => (
          <List.Item
            key={token.mintAddress}
            title={token.symbol}
            subtitle={token.name}
            accessories={[{ text: `${formatTokenBalance(token.uiAmount, token.decimals)} ${token.symbol}` }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={`Copy ${token.symbol} Balance`} content={token.uiAmount.toString()} />
                <Action.CopyToClipboard title="Copy Token Mint Address" content={token.mintAddress} />
                <Action.CopyToClipboard title="Copy Wallet Address" content={walletAddress} />
                <Action.Push
                  title={`Send ${token.symbol}`}
                  icon={Icon.Upload}
                  target={
                    <SendForm
                      tokenSymbol={token.symbol}
                      mintAddress={token.mintAddress}
                      senderAddress={walletAddress}
                      tokenDecimals={token.decimals}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!isLoading && solBalance === null && tokenBalances.length === 0 && !combinedError && (
        <List.EmptyView
          title="No Balances Found"
          description={`No SOL or token balances found for ${walletAddress}. Ensure the address is correct and has activity.`}
        />
      )}
    </List>
  );
}

export default function Command() {
  const [userWalletAddress, setUserWalletAddress] = useState<string | null>(null);
  const [isLoadingStoredWallet, setIsLoadingStoredWallet] = useState<boolean>(true);

  useEffect(() => {
    async function loadWallet() {
      try {
        const storedWallet = await LocalStorage.getItem<string>(USER_WALLET_ADDRESS_KEY);
        if (storedWallet) {
          setUserWalletAddress(storedWallet);
        }
      } catch (e) {
        console.error("Failed to load wallet from local storage", e);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error Loading Wallet",
          message: "Could not load saved wallet address.",
        });
      } finally {
        setIsLoadingStoredWallet(false);
      }
    }
    loadWallet();
  }, []);

  async function handleSetWallet(address: string) {
    setUserWalletAddress(address);
  }

  async function handleChangeWallet() {
    await LocalStorage.removeItem(USER_WALLET_ADDRESS_KEY);
    setUserWalletAddress(null);
    await showToast({ title: "Wallet Address Cleared", message: "Please enter a new wallet address." });
  }

  if (isLoadingStoredWallet) {
    return <List isLoading={true} searchBarPlaceholder="Loading wallet..." />;
  }

  if (!userWalletAddress) {
    return <WalletSetupForm onWalletSet={handleSetWallet} />;
  }

  return <BalancesView walletAddress={userWalletAddress} onChangeWallet={handleChangeWallet} />;
}
