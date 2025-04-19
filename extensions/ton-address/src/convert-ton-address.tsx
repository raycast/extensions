import { getHttpEndpoint } from "@orbs-network/ton-access";
import { Action, ActionPanel, Clipboard, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import TonWeb from "tonweb";
import { Address } from "tonweb/dist/types/utils/address";

interface AddressFormat {
  title: string;
  value: string;
}

function isTestnet(address: string): boolean {
  return address.startsWith("k") || address.startsWith("0");
}

function isValidTonAddressOrDomain(address: string): boolean {
  if (/^.+\.ton$/i.test(address)) {
    return true;
  }

  try {
    new TonWeb.utils.Address(address);
    return true;
  } catch (error) {
    return false;
  }
}

async function convertAddress(address: string): Promise<AddressFormat[]> {
  try {
    if (address.toLowerCase().endsWith(".ton")) {
      try {
        const endpoint = await getHttpEndpoint();
        const tonweb = new TonWeb(new TonWeb.HttpProvider(endpoint));

        // @ts-expect-error - TonWeb types are not complete, but the DNS functionality exists
        const walletAddress = await tonweb.dns.getWalletAddress(address);
        if (!walletAddress) {
          throw new Error("Could not resolve .ton domain");
        }

        const addressObj = new TonWeb.utils.Address(walletAddress.toString());
        return getFormattedAddresses(addressObj);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to resolve .ton domain",
          message: "Could not resolve the .ton domain to an address",
        });
        return [];
      }
    } else {
      const addressObj = new TonWeb.utils.Address(address);
      return getFormattedAddresses(addressObj);
    }
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid TON address",
      message: "Please enter a valid TON address or .ton domain",
    });
    return [];
  }
}

let errorToast: Toast | undefined;

export default function Command() {
  const [address, setAddress] = useState("");
  const [formats, setFormats] = useState<AddressFormat[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function initializeAddress() {
      const initialAddress = (await Clipboard.readText())?.trim() || "";

      setAddress(initialAddress);
      if (initialAddress) {
        if (isValidTonAddressOrDomain(initialAddress)) {
          setIsLoading(true);
          const formats = await convertAddress(initialAddress);
          if (formats.length > 0) {
            setFormats(formats);
          }
          setIsLoading(false);
        } else {
          setIsLoading(false);
          setFormats([]);
          errorToast = await showToast({
            style: Toast.Style.Failure,
            title: "Invalid TON Address",
            message: "Please enter a valid TON address or .ton domain",
          });
        }
      } else {
        setFormats([]);
        setIsLoading(false);
      }
    }
    initializeAddress();
  }, []);

  const handleSearchTextChange = async (newAddress: string) => {
    const trimmedAddress = newAddress.trim();
    setAddress(trimmedAddress);

    if (isValidTonAddressOrDomain(trimmedAddress)) {
      errorToast?.hide();
      setIsLoading(true);
      const newFormats = await convertAddress(trimmedAddress);
      setFormats(newFormats);
      setIsLoading(false);
    } else {
      if (trimmedAddress) {
        setFormats([]);
        errorToast = await showToast({
          style: Toast.Style.Failure,
          title: "Invalid TON Address",
          message: "Please enter a valid TON address or .ton domain",
        });
      }
    }
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

function getFormattedAddresses(addressObj: Address): AddressFormat[] {
  return [
    // Parameters: isUserFriendly, isUrlSafe, isBounceable, isTestOnly
    { title: "Raw Address", value: addressObj.toString(false, true, false) },
    { title: "Mainnet Bounceable", value: addressObj.toString(true, true, true) },
    { title: "Mainnet Non-bounceable", value: addressObj.toString(true, true, false) },
    { title: "Testnet Bounceable", value: addressObj.toString(true, true, true, true) },
    { title: "Testnet Non-bounceable", value: addressObj.toString(true, true, false, true) },
  ];
}
