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

interface SearchResolution {
  status: "success" | "failure";
  url?: string;
  successTitle?: string;
  failureTitle?: string;
}

interface HeuristicTarget {
  url: string;
  title: string;
}

function getHeuristicTarget(input: string, makerAddress?: string): HeuristicTarget | null {
  const maker = makerAddress?.trim() || undefined;

  if (isSolanaAddress(input)) {
    const lowerInput = input.toLowerCase();
    if (lowerInput.endsWith("pump") || lowerInput.endsWith("bonk")) {
      const suffix = lowerInput.endsWith("pump") ? "pump" : "bonk";
      return {
        url: getGMGNUrl("solana", "token", input, maker),
        title: `Heuristic match: Solana ${suffix} token`,
      };
    }
  }

  if (isEVMAddress(input)) {
    const lowerInput = input.toLowerCase();
    if (lowerInput.endsWith("4444") || lowerInput.endsWith("6666")) {
      const suffix = lowerInput.endsWith("4444") ? "4444" : "6666";
      return {
        url: getGMGNUrl("ethereum", "token", input, maker),
        title: `Heuristic match: Ethereum ${suffix} token`,
      };
    }
  }

  return null;
}

async function resolveSearchTarget(
  input: string,
  preferences: Preferences,
  makerAddress?: string
): Promise<SearchResolution> {
  const maker = makerAddress?.trim() || undefined;

  if (isTransactionHash(input)) {
    const chain = await detectTransactionChain(input);
    if (chain === "unknown") {
      return { status: "failure", failureTitle: "Unable to detect transaction chain" };
    }

    return {
      status: "success",
      url: getTransactionExplorerUrl(chain, input),
      successTitle: `Opening ${chain} transaction explorer`,
    };
  }

  if (isSolanaAddress(input)) {
    const isToken = await checkSolanaToken(input);
    const url =
      preferences.defaultTarget === "explorer"
        ? getExplorerUrl("solana", "address", input)
        : getGMGNUrl("solana", isToken ? "token" : "address", input, maker);

    return {
      status: "success",
      url,
      successTitle: `Opening Solana ${isToken ? "token" : "address"} on ${preferences.defaultTarget === "explorer" ? "Solscan" : "GMGN"}`,
    };
  }

  if (isEVMAddress(input)) {
    const tokenCheck = await checkEVMToken(input);

    if (tokenCheck.isToken && tokenCheck.chain) {
      const url =
        preferences.defaultTarget === "explorer"
          ? getExplorerUrl(tokenCheck.chain, "address", input)
          : getGMGNUrl(tokenCheck.chain, "token", input, maker);

      return {
        status: "success",
        url,
        successTitle: `Opening ${tokenCheck.chain} token on ${preferences.defaultTarget === "explorer" ? "explorer" : "GMGN"}`,
      };
    }

    const nonceChain = await checkEVMNonce(input);
    if (nonceChain) {
      const url =
        preferences.defaultTarget === "explorer"
          ? getExplorerUrl(nonceChain, "address", input)
          : getGMGNUrl(nonceChain, "address", input, maker);

      return {
        status: "success",
        url,
        successTitle: `Opening ${nonceChain} address on ${preferences.defaultTarget === "explorer" ? "explorer" : "GMGN"}`,
      };
    }

    const defaultChain: ChainType = "ethereum";
    const url =
      preferences.defaultTarget === "explorer"
        ? getExplorerUrl(defaultChain, "address", input)
        : getGMGNUrl(defaultChain, "address", input, maker);

    return {
      status: "success",
      url,
      successTitle: `Opening address on Ethereum (default) ${preferences.defaultTarget === "explorer" ? "explorer" : "GMGN"}`,
    };
  }

  return { status: "failure", failureTitle: "Invalid address or transaction hash" };
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

    const heuristicTarget = getHeuristicTarget(input, makerAddress);
    const heuristicUrl = heuristicTarget?.url;

    try {
      if (heuristicTarget) {
        void open(heuristicTarget.url).catch(() => undefined);
        showToast({
          style: Toast.Style.Animated,
          title: heuristicTarget.title,
          message: "Opening GMGN immediately while verification continues",
        });
      }

      const resolution = await resolveSearchTarget(input, preferences, makerAddress);

      if (resolution.status === "failure") {
        showToast({
          style: Toast.Style.Failure,
          title: resolution.failureTitle || "Error",
          message: heuristicUrl ? "Heuristic GMGN page was already opened" : undefined,
        });
        return;
      }

      if (!resolution.url || !resolution.successTitle) {
        showToast({ style: Toast.Style.Failure, title: "Unable to resolve target URL" });
        return;
      }

      if (resolution.url !== heuristicUrl) {
        await open(resolution.url);
      }

      showToast({
        style: Toast.Style.Success,
        title: resolution.successTitle,
        message:
          heuristicUrl && resolution.url === heuristicUrl
            ? "Heuristic result confirmed; skipped duplicate open"
            : heuristicUrl
              ? "Heuristic differed; opened verified target"
              : undefined,
      });
    } catch (error) {
      // Sanitize error messages to prevent information disclosure
      let errorMessage = "An error occurred while processing your request";

      if (error instanceof Error) {
        if (error.message.includes("Rate limit")) {
          errorMessage = "Too many requests. Please wait a moment and try again.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "Request timed out. Please try again.";
        } else if (error.message.includes("network") || error.message.includes("connection")) {
          errorMessage = "Network error. Please check your connection.";
        }
      }

      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: heuristicUrl ? `${errorMessage} Heuristic GMGN page was already opened.` : errorMessage,
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
