import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, open } from "@raycast/api";
import { useState } from "react";
import {
  isSolanaAddress,
  isEVMAddress,
  isTransactionHash,
  checkSolanaToken,
  checkEVMToken,
  checkEVMNonce,
  detectTransactionChain,
  ChainType,
} from "./utils/blockchain";
import { getGMGNUrl, getExplorerUrl, getTransactionExplorerUrl } from "./utils/urls";

interface Preferences {
  defaultTarget: "gmgn" | "explorer";
}

export default function SearchCommand() {
  const [searchText, setSearchText] = useState("");
  const [makerAddress, setMakerAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit() {
    if (!searchText.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Please enter an address or transaction hash" });
      return;
    }

    setIsLoading(true);
    const input = searchText.trim();

    try {
      if (isTransactionHash(input)) {
        const chain = await detectTransactionChain(input);
        if (chain === "unknown") {
          showToast({ style: Toast.Style.Failure, title: "Unable to detect transaction chain" });
          return;
        }
        const url = getTransactionExplorerUrl(chain, input);
        await open(url);
        showToast({ style: Toast.Style.Success, title: `Opening ${chain} transaction explorer` });
      } else if (isSolanaAddress(input)) {
        const isToken = await checkSolanaToken(input);
        let url: string;

        if (preferences.defaultTarget === "explorer") {
          url = getExplorerUrl("solana", "address", input);
        } else {
          url = getGMGNUrl("solana", isToken ? "token" : "address", input, makerAddress.trim() || undefined);
        }

        await open(url);
        showToast({
          style: Toast.Style.Success,
          title: `Opening Solana ${isToken ? "token" : "address"} on ${preferences.defaultTarget === "explorer" ? "Solscan" : "GMGN"}`,
        });
      } else if (isEVMAddress(input)) {
        const tokenCheck = await checkEVMToken(input);

        if (tokenCheck.isToken && tokenCheck.chain) {
          let url: string;
          if (preferences.defaultTarget === "explorer") {
            url = getExplorerUrl(tokenCheck.chain, "address", input);
          } else {
            url = getGMGNUrl(tokenCheck.chain, "token", input, makerAddress.trim() || undefined);
          }
          await open(url);
          showToast({
            style: Toast.Style.Success,
            title: `Opening ${tokenCheck.chain} token on ${preferences.defaultTarget === "explorer" ? "explorer" : "GMGN"}`,
          });
        } else {
          const nonceChain = await checkEVMNonce(input);
          if (nonceChain) {
            let url: string;
            if (preferences.defaultTarget === "explorer") {
              url = getExplorerUrl(nonceChain, "address", input);
            } else {
              url = getGMGNUrl(nonceChain, "address", input, makerAddress.trim() || undefined);
            }
            await open(url);
            showToast({
              style: Toast.Style.Success,
              title: `Opening ${nonceChain} address on ${preferences.defaultTarget === "explorer" ? "explorer" : "GMGN"}`,
            });
          } else {
            const defaultChain: ChainType = "ethereum";
            let url: string;
            if (preferences.defaultTarget === "explorer") {
              url = getExplorerUrl(defaultChain, "address", input);
            } else {
              url = getGMGNUrl(defaultChain, "address", input, makerAddress.trim() || undefined);
            }
            await open(url);
            showToast({
              style: Toast.Style.Success,
              title: `Opening address on Ethereum (default) ${preferences.defaultTarget === "explorer" ? "explorer" : "GMGN"}`,
            });
          }
        }
      } else {
        showToast({ style: Toast.Style.Failure, title: "Invalid address or transaction hash" });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error processing request",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="search"
        title="Address or TX Hash"
        placeholder="Enter Solana/EVM address or transaction hash..."
        value={searchText}
        onChange={setSearchText}
      />
      <Form.TextField
        id="maker"
        title="Maker Address (Optional)"
        placeholder="Enter maker address for GMGN filter..."
        value={makerAddress}
        onChange={setMakerAddress}
      />
      <Form.Description
        title="Info"
        text={`Default target: ${preferences.defaultTarget === "explorer" ? "Block Explorer" : "GMGN"}\nMaker address will append ?maker= parameter to GMGN URLs`}
      />
    </Form>
  );
}
