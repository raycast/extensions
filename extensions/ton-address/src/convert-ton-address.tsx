import { getHttpEndpoint } from "@orbs-network/ton-access";
import { Action, ActionPanel, Clipboard, Icon, List, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import TonWeb from "tonweb";
import { getFormattedAddresses, isTestnet, isValidTonAddressOrDomain, type AddressFormat } from "./lib/utils";

class InvalidTonAddressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTonAddressError";
  }
}

class TonDomainResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TonDomainResolutionError";
  }
}

async function convertAddress(address: string): Promise<AddressFormat[]> {
  try {
    if (address.toLowerCase().endsWith(".ton")) {
      const endpoint = await getHttpEndpoint();
      const tonweb = new TonWeb(new TonWeb.HttpProvider(endpoint));

      // @ts-expect-error - TonWeb types are not complete, but the DNS functionality exists
      const walletAddress = await tonweb.dns.getWalletAddress(address);
      if (!walletAddress) {
        throw new TonDomainResolutionError("Could not resolve .ton domain");
      }

      const addressObj = new TonWeb.utils.Address(walletAddress.toString());
      return getFormattedAddresses(addressObj);
    } else {
      const addressObj = new TonWeb.utils.Address(address);
      return getFormattedAddresses(addressObj);
    }
  } catch (error) {
    if (error instanceof InvalidTonAddressError) {
      throw error;
    }
    throw error;
  }
}

export default function Command() {
  const [address, setAddress] = useState("");
  const [formats, setFormats] = useState<AddressFormat[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const errorToast = useRef<Toast | undefined>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);

  const processAddress = async (inputAddress: string) => {
    const trimmedAddress = inputAddress.trim();

    if (!trimmedAddress) {
      setFormats([]);
      setIsLoading(false);
      return;
    }

    if (!isValidTonAddressOrDomain(trimmedAddress)) {
      setFormats([]);
      errorToast.current = await showToast({
        style: Toast.Style.Failure,
        title: "Invalid TON Address",
        message: "Please enter a valid TON address or .ton domain",
      });
      setIsLoading(false);
      return;
    }

    errorToast.current?.hide();
    setIsLoading(true);
    try {
      const newFormats = await convertAddress(trimmedAddress);
      setFormats(newFormats);
    } catch (error) {
      let errorToastOptions: Toast.Options;

      if (error instanceof InvalidTonAddressError) {
        errorToastOptions = {
          title: "Invalid TON address",
          message: "Please enter a valid TON address or .ton domain",
        };
      } else if (error instanceof TonDomainResolutionError) {
        errorToastOptions = {
          title: "Could not resolve .ton domain",
          message: "Try again with a different .ton domain",
        };
      } else {
        errorToastOptions = {
          title: "Error converting address",
          message: "Please enter a valid TON address or .ton domain",
        };
      }

      errorToast.current = await showFailureToast(error, errorToastOptions);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    async function initializeAddress() {
      const initialAddress = (await Clipboard.readText())?.trim() || "";
      setIsInitialized(true);

      if (!initialAddress || !isValidTonAddressOrDomain(initialAddress)) {
        setAddress("");
        setFormats([]);
        return;
      }

      setAddress(initialAddress);
      await processAddress(initialAddress);
    }
    initializeAddress();
  }, []);

  const handleSearchTextChange = async (newAddress: string) => {
    if (!isInitialized) {
      return;
    }

    setAddress(newAddress);
    await processAddress(newAddress);
  };

  return (
    <List
      navigationTitle="Convert TON Address"
      searchText={address}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Enter TON address or .ton domain"
      isLoading={formats === undefined || isLoading}
      throttle
    >
      {formats?.map((format) => (
        <List.Item
          key={format.title}
          title={format.title}
          subtitle={format.value}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={format.value} />
              {format.value && (
                <Action.OpenInBrowser
                  url={`https://${isTestnet(format.value) ? "testnet." : ""}tonviewer.com/${format.value}`}
                  title="Open in Tonviewer"
                />
              )}
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView icon={Icon.Wallet} title={"Address not found"} />
    </List>
  );
}
