import { useState, useEffect, useRef } from "react";
import { LocalStorage, showToast, ToastStyle, open, environment } from "@raycast/api";
import TonWeb from "tonweb";
import { TonConnect, EventDispatcher, SdkActionEvent } from "@tonconnect/sdk";
import { ConnectionData } from "../types";

const tonweb = new TonWeb(
  new TonWeb.HttpProvider("https://toncenter.com/api/v2/jsonRPC", {
    apiKey: environment.TONCENTER_API_KEY || "",
  }),
);

export function useTonConnect() {
  // State variables
  const [balance, setBalance] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [addressFormats, setAddressFormats] = useState<{
    hex: string;
    bounceable: string;
    nonBounceable: string;
  } | null>(null);

  // Refs for the connector and unsubscribe function
  const connectorRef = useRef<TonConnect | null>(null);
  const unsubscribeFromStatusChange = useRef<(() => void) | null>(null);

  // Wallet connection source
  const walletConnectionSource = {
    universalLink: "https://app.tonkeeper.com/ton-connect",
    bridgeUrl: "https://bridge.tonapi.io/bridge",
  };

  // Event dispatcher
  const eventDispatcher: EventDispatcher<SdkActionEvent> = {
    dispatchEvent: async (eventName, eventDetails) => {
      console.log(`Event: ${eventName}, details:`, eventDetails);

      if (eventName === "ton-connect-connection-completed") {
        const connectionData = eventDetails as ConnectionData;

        // Save connection data
        await LocalStorage.setItem("walletConnectionData", JSON.stringify(connectionData));

        // Update state
        setWalletConnected(true);
        setWalletAddress(connectionData.wallet_address);

        // Conversion and fetching will be handled in onStatusChange
      }
    },
  };

  // Initialize TonConnect
  useEffect(() => {
    if (!connectorRef.current) {
      connectorRef.current = new TonConnect({
        manifestUrl: "https://app.bemo.fi/tonconnect-manifest.json",
        storage: LocalStorage,
        eventDispatcher,
      });
    }

    const connector = connectorRef.current;

    // Load connection data
    loadConnectionData(connector);

    // Cleanup
    return () => {
      if (unsubscribeFromStatusChange.current) {
        unsubscribeFromStatusChange.current();
        unsubscribeFromStatusChange.current = null;
      }
    };
  }, []);

  async function loadConnectionData(connector: TonConnect) {
    console.log("Load Connection Data called");
    try {
      const storedConnection = await LocalStorage.getItem<string>("walletConnectionData");

      if (storedConnection) {
        const connectionData = JSON.parse(storedConnection) as ConnectionData;

        await connector.restoreConnection();

        if (connector.connected && connector.wallet) {
          setWalletConnected(true);
          setWalletAddress(connectionData.wallet_address);

          await processWalletData(connectionData.wallet_address);
        } else {
          // Wallet not connected, clear stored data
          await LocalStorage.removeItem("walletConnectionData");
          resetState();

          subscribeToConnection(connector);
        }
      } else {
        // No stored connection
        subscribeToConnection(connector);
      }
    } catch (error) {
      console.error("Error loading connection data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function subscribeToConnection(connector: TonConnect) {
    console.log("Subscribe to Connection called");

    if (unsubscribeFromStatusChange.current) {
      console.log("Already subscribed to connection status changes");
      return;
    }

    unsubscribeFromStatusChange.current = connector.onStatusChange(async (wallet) => {
      if (wallet) {
        // Wallet connected
        console.log("Wallet connected:", wallet);
        setWalletConnected(true);
        setWalletAddress(wallet.account.address);

        const connectionData: ConnectionData = {
          type: "connection-completed",
          is_success: true,
          wallet_address: wallet.account.address,
          wallet_type: wallet.device.appName,
          wallet_version: wallet.device.appVersion,
          auth_type: wallet.connectItems?.ton_proof ? "ton_proof" : "ton_addr",
          custom_data: {
            chain_id: wallet.chain,
            provider: wallet.provider,
            ton_connect_sdk_lib: wallet.sdkVersion,
            ton_connect_ui_lib: null,
          },
        };

        // Store connection data
        LocalStorage.setItem("walletConnectionData", JSON.stringify(connectionData));

        // Process wallet data
        await processWalletData(wallet.account.address);
      } else {
        // Wallet disconnected
        console.log("Wallet disconnected");
        resetState();

        // Remove connection data
        LocalStorage.removeItem("walletConnectionData");
      }
      setIsLoading(false);
    });
  }

  function resetState() {
    setWalletConnected(false);
    setWalletAddress(null);
    setBalance(null);
    setAddressFormats(null);
    setIsLoading(false);
  }

  async function processWalletData(address: string) {
    try {
      setIsLoading(true);
      // Convert address formats
      const formats = getAddressFormats(address);
      setAddressFormats(formats);

      // Fetch balance
      await fetchBalance(address);
    } catch (error) {
      console.error("Error processing wallet data:", error);
      showToast(ToastStyle.Failure, "Error Processing Wallet Data", error.message || String(error));
    } finally {
      setIsLoading(false);
    }
  }

  function getAddressFormats(address: string) {
    const walletAddress = new TonWeb.utils.Address(address);
    const bounceable = walletAddress.toString(true, true, true);
    const nonBounceable = walletAddress.toString(true, true, false);
    const hex = walletAddress.toString(false, false, true);

    return {
      bounceable,
      nonBounceable,
      hex,
    };
  }

  async function fetchBalance(address: string) {
    console.log("Fetch Balance called with address:", address);
    try {
      const fetchedBalance = await getTonBalance(address);
      setBalance(fetchedBalance);
      showToast(ToastStyle.Success, "Balance Fetched", `Balance: ${fetchedBalance} TON`);
    } catch (error) {
      console.error("Error in fetchBalance:", error);
      showToast(ToastStyle.Failure, "Failed to Fetch Balance", error.message || String(error));
    }
  }

  async function getTonBalance(address: string) {
    console.log("Get Ton Balance called with address:", address);

    try {
      const balanceResponse = await tonweb.provider.getBalance(address);
      console.log("Received balanceResponse:", balanceResponse);

      // Convert balanceResponse to a string
      const balanceStr = balanceResponse.toString();

      // Check if balanceStr is a valid numeric string
      if (!/^\d+$/.test(balanceStr)) {
        // balanceStr is not a valid number; handle it as an error message
        const errorMessage = balanceStr.toLowerCase();
        if (errorMessage.includes("ratelimit exceed") || errorMessage.includes("rate limit exceed")) {
          throw new Error("Rate limit exceeded. Please try again later.");
        } else {
          throw new Error(`API Error: ${balanceResponse}`);
        }
      }

      // balanceStr is a valid numeric string; pass it to fromNano
      const balanceTon = TonWeb.utils.fromNano(balanceStr);
      console.log("Converted balance to TON:", balanceTon);
      return balanceTon;
    } catch (error) {
      console.error("Error in getTonBalance:", error);
      throw error;
    }
  }

  function handleConnectWallet() {
    console.log("Handle Connect Wallet called");
    const connector = connectorRef.current;
    if (!connector) {
      console.error("Connector is not initialized");
      return;
    }

    if (connector.connected) {
      console.log("Connector already connected");
      return;
    }

    const universalLink = connector.connect(walletConnectionSource);

    open(universalLink)
      .then(() => {
        showToast(ToastStyle.Success, "Opening Wallet Connection", "Please check your wallet to connect.");
      })
      .catch((error) => {
        showToast(ToastStyle.Failure, "Failed to Open Link", error.message || String(error));
      });
  }

  function handleDisconnectWallet() {
    console.log("Handle Disconnect Wallet called");
    const connector = connectorRef.current;
    if (!connector) {
      console.error("Connector is not initialized");
      return;
    }

    if (unsubscribeFromStatusChange.current) {
      unsubscribeFromStatusChange.current();
      unsubscribeFromStatusChange.current = null;
    }

    // Disconnect the wallet
    connector.disconnect();

    // Reset state
    resetState();

    // Remove connection data
    LocalStorage.removeItem("walletConnectionData");

    showToast(ToastStyle.Success, "Wallet Disconnected", "You have successfully disconnected your wallet.");
  }

  return {
    balance,
    walletConnected,
    walletAddress,
    addressFormats,
    handleConnectWallet,
    handleDisconnectWallet,
    fetchBalance,
    isLoading,
  };
}
