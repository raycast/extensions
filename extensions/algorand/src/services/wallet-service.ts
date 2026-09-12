import { LocalStorage, showToast, Toast } from "@raycast/api";
import algosdk from "algosdk";
import * as crypto from "crypto";
import { Swap, SwapQuote, SwapQuoteType, V2PoolInfo, SupportedNetwork, poolUtils } from "@tinymanorg/tinyman-js-sdk";

// Interface for Tinyman Analytics API asset response
interface TinymanAsset {
  id: number;
  name: string;
  unit_name: string;
  decimals: number;
  logo?: {
    png?: string;
    svg?: string;
  };
  usd_value?: string | null;
  is_verified?: boolean;
}

interface TinymanAssetsResponse {
  results: TinymanAsset[];
}

export interface WalletData {
  address: string;
  mnemonic: string;
  createdAt: string;
}

export interface StoredWallet {
  address: string;
  encryptedMnemonic: string;
  iv: string;
  createdAt: string;
}

export class WalletService {
  private static instance: WalletService;
  private cachedWallet: WalletData | null = null;
  private readonly WALLET_KEY = "default_algorand_wallet";
  private readonly DEFAULT_PASSWORD = "raycast_algorand_default_2024";

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  private encryptMnemonic(mnemonic: string, password: string): { encrypted: string; iv: string } {
    const algorithm = "aes-256-cbc";
    const key = crypto.scryptSync(password, "algorand-salt", 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(mnemonic, "utf8", "hex");
    encrypted += cipher.final("hex");

    return {
      encrypted,
      iv: iv.toString("hex"),
    };
  }

  private decryptMnemonic(encrypted: string, iv: string, password: string): string {
    const algorithm = "aes-256-cbc";
    const key = crypto.scryptSync(password, "algorand-salt", 32);
    const ivBuffer = Buffer.from(iv, "hex");
    const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  async generateWallet(): Promise<WalletData> {
    const account = algosdk.generateAccount();
    const mnemonic = algosdk.secretKeyToMnemonic(account.sk);

    const wallet: WalletData = {
      address: account.addr,
      mnemonic: mnemonic,
      createdAt: new Date().toISOString(),
    };

    return wallet;
  }

  async saveWallet(wallet: WalletData): Promise<void> {
    const { encrypted, iv } = this.encryptMnemonic(wallet.mnemonic, this.DEFAULT_PASSWORD);

    const storedWallet: StoredWallet = {
      address: wallet.address,
      encryptedMnemonic: encrypted,
      iv,
      createdAt: wallet.createdAt,
    };

    await LocalStorage.setItem(this.WALLET_KEY, JSON.stringify(storedWallet));
    this.cachedWallet = wallet;
  }

  async loadWallet(): Promise<WalletData | null> {
    if (this.cachedWallet) {
      return this.cachedWallet;
    }

    try {
      const stored = await LocalStorage.getItem(this.WALLET_KEY);
      if (!stored) {
        return null;
      }

      const storedWallet: StoredWallet = JSON.parse(stored as string);
      const mnemonic = this.decryptMnemonic(storedWallet.encryptedMnemonic, storedWallet.iv, this.DEFAULT_PASSWORD);

      const wallet: WalletData = {
        address: storedWallet.address,
        mnemonic,
        createdAt: storedWallet.createdAt,
      };

      this.cachedWallet = wallet;
      return wallet;
    } catch (error) {
      console.error("Error loading wallet:", error);
      return null;
    }
  }

  async getOrCreateWallet(): Promise<WalletData> {
    let wallet = await this.loadWallet();

    if (!wallet) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating Wallet...",
        message: "Generating your Algorand wallet",
      });

      wallet = await this.generateWallet();
      await this.saveWallet(wallet);

      await showToast({
        style: Toast.Style.Success,
        title: "Wallet Created!",
        message: "Your Algorand wallet is ready",
      });
    }

    return wallet;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getAccountInfo(address: string): Promise<any> {
    const algodClient = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "");
    try {
      return await algodClient.accountInformation(address).do();
    } catch {
      throw new Error("Account not found on testnet. Try funding it first.");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getDetailedAccountAssets(address: string): Promise<any[]> {
    const algodClient = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "");

    try {
      const accountInfo = await algodClient.accountInformation(address).do();

      if (!accountInfo.assets || accountInfo.assets.length === 0) {
        return [];
      }

      // Fetch detailed information for each asset
      const detailedAssets = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        accountInfo.assets.map(async (asset: any) => {
          try {
            const assetInfo = await algodClient.getAssetByID(asset["asset-id"]).do();
            return {
              id: asset["asset-id"],
              amount: asset.amount,
              isFrozen: asset["is-frozen"] || false,
              // Asset details from the blockchain
              name: assetInfo.params.name || `Asset ${asset["asset-id"]}`,
              unitName: assetInfo.params["unit-name"] || `ASA${asset["asset-id"]}`,
              decimals: assetInfo.params.decimals || 0,
              total: assetInfo.params.total,
              creator: assetInfo.params.creator,
              manager: assetInfo.params.manager,
              reserve: assetInfo.params.reserve,
              freeze: assetInfo.params.freeze,
              clawback: assetInfo.params.clawback,
              url: assetInfo.params.url,
              metadataHash: assetInfo.params["metadata-hash"],
              defaultFrozen: assetInfo.params["default-frozen"],
              // Formatted amount considering decimals
              formattedAmount: (asset.amount / Math.pow(10, assetInfo.params.decimals || 0)).toFixed(
                assetInfo.params.decimals || 0,
              ),
            };
          } catch (error) {
            console.error(`Error fetching details for asset ${asset["asset-id"]}:`, error);
            return {
              id: asset["asset-id"],
              amount: asset.amount,
              isFrozen: asset["is-frozen"] || false,
              name: `Asset ${asset["asset-id"]}`,
              unitName: `ASA${asset["asset-id"]}`,
              decimals: 0,
              formattedAmount: asset.amount.toString(),
            };
          }
        }),
      );

      return detailedAssets;
    } catch (error) {
      console.error("Error fetching detailed account assets:", error);
      return [];
    }
  }

  async sendPayment(
    fromMnemonic: string,
    toAddress: string,
    amountInAlgo: number,
    note?: string,
  ): Promise<{ txId: string; confirmedRound: number }> {
    const algodClient = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "");

    // Get account from mnemonic
    const account = algosdk.mnemonicToSecretKey(fromMnemonic);

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Convert ALGO to microAlgos
    const amountInMicroAlgos = Math.round(amountInAlgo * 1000000);

    // Create transaction
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: account.addr,
      to: toAddress,
      amount: amountInMicroAlgos,
      note: note ? new Uint8Array(Buffer.from(note)) : undefined,
      suggestedParams,
    });

    // Sign transaction
    const signedTxn = txn.signTxn(account.sk);

    // Submit transaction
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();

    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

    return {
      txId,
      confirmedRound: confirmedTxn["confirmed-round"],
    };
  }

  async createAsset(
    creatorMnemonic: string,
    assetName: string,
    unitName: string,
    totalSupply: number,
    decimals: number = 0,
    defaultFrozen: boolean = false,
    url?: string,
    metadataHash?: string,
  ): Promise<{ assetId: number; txId: string }> {
    const algodClient = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "");

    // Get account from mnemonic
    const account = algosdk.mnemonicToSecretKey(creatorMnemonic);

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create asset creation transaction
    const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      from: account.addr,
      assetName,
      unitName,
      total: totalSupply,
      decimals,
      defaultFrozen,
      manager: account.addr,
      reserve: account.addr,
      freeze: account.addr,
      clawback: account.addr,
      assetURL: url,
      assetMetadataHash: metadataHash ? new Uint8Array(Buffer.from(metadataHash, "hex")) : undefined,
      suggestedParams,
    });

    // Sign transaction
    const signedTxn = txn.signTxn(account.sk);

    // Submit transaction
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();

    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

    // Extract asset ID from transaction
    const assetId = confirmedTxn["asset-index"];

    return {
      assetId,
      txId,
    };
  }

  async optInToAsset(accountMnemonic: string, assetId: number): Promise<{ txId: string }> {
    const algodClient = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "");

    // Get account from mnemonic
    const account = algosdk.mnemonicToSecretKey(accountMnemonic);

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create asset opt-in transaction (transfer 0 assets to self)
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: account.addr,
      to: account.addr,
      assetIndex: assetId,
      amount: 0,
      suggestedParams,
    });

    // Sign transaction
    const signedTxn = txn.signTxn(account.sk);

    // Submit transaction
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();

    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, txId, 4);

    return { txId };
  }

  async transferAsset(
    fromMnemonic: string,
    toAddress: string,
    assetId: number,
    amount: number,
    note?: string,
  ): Promise<{ txId: string }> {
    const algodClient = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "");

    // Get account from mnemonic
    const account = algosdk.mnemonicToSecretKey(fromMnemonic);

    // Get suggested parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create asset transfer transaction
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: account.addr,
      to: toAddress,
      assetIndex: assetId,
      amount,
      note: note ? new Uint8Array(Buffer.from(note)) : undefined,
      suggestedParams,
    });

    // Sign transaction
    const signedTxn = txn.signTxn(account.sk);

    // Submit transaction
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();

    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, txId, 4);

    return { txId };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async fundTestnet(address: string): Promise<any> {
    const faucetUrl = `https://bank.testnet.algorand.network/api/v2/accounts/${address}`;
    const response = await fetch(faucetUrl, { method: "POST" });

    if (!response.ok) {
      throw new Error(`Faucet request failed: ${response.statusText}`);
    }

    return await response.json();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTransactionHistory(address: string, limit: number = 50): Promise<any> {
    const indexerClient = new algosdk.Indexer("", "https://testnet-idx.algonode.cloud", "");

    try {
      const response = await indexerClient.searchForTransactions().address(address).limit(limit).do();

      return response;
    } catch {
      throw new Error("Failed to fetch transaction history");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getAssetInfo(assetId: number): Promise<any> {
    const algodClient = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "");

    try {
      const assetInfo = await algodClient.getAssetByID(assetId).do();
      return {
        id: assetInfo.index || assetId,
        params: {
          name: assetInfo.params?.name || "",
          unitName: assetInfo.params?.["unit-name"] || assetInfo.params?.unitName || "",
          total: assetInfo.params?.total || 0,
          decimals: assetInfo.params?.decimals || 0,
          defaultFrozen: assetInfo.params?.["default-frozen"] || assetInfo.params?.defaultFrozen || false,
          url: assetInfo.params?.url || "",
          metadataHash: assetInfo.params?.["metadata-hash"] || assetInfo.params?.metadataHash || "",
          manager: assetInfo.params?.manager || "",
          reserve: assetInfo.params?.reserve || "",
          freeze: assetInfo.params?.freeze || "",
          clawback: assetInfo.params?.clawback || "",
          creator: assetInfo.params?.creator || "",
        },
        createdAtRound: assetInfo["created-at-round"] || null,
        deleted: assetInfo.deleted || false,
      };
    } catch {
      throw new Error(`Failed to get asset info: Asset ${assetId} not found or invalid`);
    }
  }

  getPrivateKeyFromMnemonic(mnemonic: string): string {
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    return Buffer.from(account.sk).toString("hex");
  }

  getPublicKeyFromMnemonic(mnemonic: string): string {
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    return Buffer.from(account.sk.slice(32)).toString("hex");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatTransactionType(txn: any): string {
    if (txn["tx-type"] === "pay") {
      return "Payment";
    } else if (txn["tx-type"] === "axfer") {
      return "Asset Transfer";
    } else if (txn["tx-type"] === "acfg") {
      if (txn["asset-config-transaction"]["asset-id"] === 0) {
        return "Asset Creation";
      } else {
        return "Asset Configuration";
      }
    } else if (txn["tx-type"] === "afrz") {
      return "Asset Freeze";
    } else if (txn["tx-type"] === "appl") {
      return "Application Call";
    } else if (txn["tx-type"] === "keyreg") {
      return "Key Registration";
    }
    return txn["tx-type"].toUpperCase();
  }

  formatAmount(amount: number, decimals: number = 6): string {
    return (amount / Math.pow(10, decimals)).toFixed(decimals);
  }

  // Swap-related methods using Tinyman DEX
  private readonly TINYMAN_NETWORK: SupportedNetwork = "testnet";

  // Store the latest quote and pool info for executing swaps
  private currentSwapQuote: SwapQuote | null = null;
  private currentPool: V2PoolInfo | null = null;
  private currentSwapParams: {
    fromAssetId: number;
    toAssetId: number;
    fromDecimals: number;
    toDecimals: number;
    walletAddress: string;
    slippage: number;
  } | null = null;

  private getAlgodClient(): algosdk.Algodv2 {
    return new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "");
  }

  async getSwapQuote(
    fromAssetId: number,
    toAssetId: number,
    amount: string,
    walletAddress: string,
    slippage: string = "0.005", // 0.5% default slippage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    try {
      const algodClient = this.getAlgodClient();

      // Fetch asset details for display and quote calculation
      const assetInInfo =
        fromAssetId === 0
          ? { name: "Algorand", unitName: "ALGO", decimals: 6 }
          : await this.getAssetInfo(fromAssetId).then((info) => ({
              name: info.params.name,
              unitName: info.params.unitName,
              decimals: info.params.decimals,
            }));

      const assetOutInfo =
        toAssetId === 0
          ? { name: "Algorand", unitName: "ALGO", decimals: 6 }
          : await this.getAssetInfo(toAssetId).then((info) => ({
              name: info.params.name,
              unitName: info.params.unitName,
              decimals: info.params.decimals,
            }));

      // Fetch pool info - use the correct asset ordering (higher ID first for Tinyman)
      const [asset1ID, asset2ID] = fromAssetId > toAssetId ? [fromAssetId, toAssetId] : [toAssetId, fromAssetId];

      const pool = await poolUtils.v2.getPoolInfo({
        client: algodClient,
        network: this.TINYMAN_NETWORK,
        asset1ID,
        asset2ID,
      });

      if (!pool || !poolUtils.isPoolReady(pool)) {
        throw new Error("Pool not found or not ready for this asset pair");
      }

      // Use the SDK's full swap quote with the pool we fetched
      // This ensures proper asset ordering and quote structure
      const quote = await Swap.v2.getFixedInputSwapQuote({
        amount: BigInt(amount),
        assetIn: { id: fromAssetId, decimals: assetInInfo.decimals },
        assetOut: { id: toAssetId, decimals: assetOutInfo.decimals },
        pool: pool,
        network: this.TINYMAN_NETWORK,
        isSwapRouterEnabled: false,
      });

      // Store quote and params for later execution
      this.currentSwapQuote = quote;
      this.currentPool = pool;
      this.currentSwapParams = {
        fromAssetId,
        toAssetId,
        fromDecimals: assetInInfo.decimals,
        toDecimals: assetOutInfo.decimals,
        walletAddress,
        slippage: parseFloat(slippage),
      };

      // Extract quote data based on quote type
      let amountOut: bigint;
      let priceImpact: number;

      if (quote.type === SwapQuoteType.Direct) {
        amountOut = quote.data.quote.assetOutAmount;
        priceImpact = quote.data.quote.priceImpact * 100;
      } else {
        // Router quote
        const routerData = quote.data;
        const lastRoute = routerData.route[routerData.route.length - 1];
        amountOut = BigInt(lastRoute.quote.amount_out.amount);
        priceImpact = parseFloat(routerData.price_impact) * 100;
      }

      // Calculate slippage-adjusted output
      const slippagePercent = parseFloat(slippage);
      const amountOutWithSlippage = amountOut - BigInt(Math.floor(Number(amountOut) * slippagePercent));

      // Calculate price
      const amountInNum = Number(amount);
      const amountOutNum = Number(amountOut);
      const price = amountOutNum / amountInNum;

      // Return a quote object compatible with the UI
      return {
        quote_id_str: `tinyman_${Date.now()}`, // Generate a unique ID
        provider: "Tinyman V2",
        asset_in: {
          asset_id: fromAssetId,
          name: assetInInfo.name,
          unit_name: assetInInfo.unitName,
          logo: "",
          fraction_decimals: assetInInfo.decimals,
          usd_value: null,
          is_verified: true,
          verification_tier: "verified" as const,
        },
        asset_out: {
          asset_id: toAssetId,
          name: assetOutInfo.name,
          unit_name: assetOutInfo.unitName,
          logo: "",
          fraction_decimals: assetOutInfo.decimals,
          usd_value: null,
          is_verified: true,
          verification_tier: "verified" as const,
        },
        amount_in: amount,
        amount_out: amountOut.toString(),
        amount_out_with_slippage: amountOutWithSlippage.toString(),
        slippage: slippage,
        price: price.toString(),
        price_impact: priceImpact.toFixed(4),
        pera_fee_amount: "0", // Tinyman has no Pera fee
        exchange_fee_amount: (Number(amount) * 0.003).toString(), // Tinyman V2 has 0.3% fee
      };
    } catch (error) {
      console.error("Error getting Tinyman quote:", error);
      throw new Error(`Failed to get swap quote: ${error}`);
    }
  }

  async executeSwap(_quoteId: string, mnemonic: string): Promise<{ txId: string; confirmedRound: number }> {
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    const algodClient = this.getAlgodClient();

    try {
      if (!this.currentSwapQuote || !this.currentSwapParams || !this.currentPool) {
        throw new Error("No swap quote available. Please get a quote first.");
      }

      const quote = this.currentSwapQuote;
      const pool = this.currentPool;
      const params = this.currentSwapParams;

      // Extract quote details
      if (quote.type !== SwapQuoteType.Direct) {
        throw new Error("Only direct swaps are supported");
      }

      const directQuote = quote.data.quote;
      // Convert to numbers - SDK quote may return BigInt or number
      const assetInID = Number(directQuote.assetInID);
      const assetInAmount = BigInt(directQuote.assetInAmount);
      const assetOutID = Number(directQuote.assetOutID);
      const assetOutAmount = BigInt(directQuote.assetOutAmount);

      // Check if user needs to opt in to the output asset
      if (assetOutID !== 0) {
        const accountInfo = await algodClient.accountInformation(account.addr).do();
        const isOptedIn = accountInfo.assets?.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (asset: any) => asset["asset-id"] === assetOutID,
        );

        if (!isOptedIn) {
          console.log(`Opting in to asset ${assetOutID}...`);
          const optInParams = await algodClient.getTransactionParams().do();
          const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: account.addr,
            to: account.addr,
            assetIndex: assetOutID,
            amount: 0,
            suggestedParams: optInParams,
          });
          const signedOptIn = optInTxn.signTxn(account.sk);
          const { txId: optInTxId } = await algodClient.sendRawTransaction(signedOptIn).do();
          await algosdk.waitForConfirmation(algodClient, optInTxId, 4);
          console.log(`Opted in to asset ${assetOutID}`);
        }
      }

      // Calculate minimum output with slippage
      const minAmountOut = assetOutAmount - BigInt(Math.floor(Number(assetOutAmount) * params.slippage));

      // Get transaction params
      const suggestedParams = await algodClient.getTransactionParams().do();

      // Pool address
      const poolAddress = pool.account.address();

      // Build swap transactions manually
      // Transaction 1: Input asset transfer to pool
      let inputTxn: algosdk.Transaction;
      if (assetInID === 0) {
        // ALGO payment
        inputTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: account.addr,
          to: poolAddress,
          amount: assetInAmount,
          suggestedParams,
        });
      } else {
        // ASA transfer
        inputTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: account.addr,
          to: poolAddress,
          assetIndex: assetInID,
          amount: assetInAmount,
          suggestedParams,
        });
      }

      // Transaction 2: App call to validator
      const swapAppArgs = [
        new Uint8Array(Buffer.from("swap")),
        new Uint8Array(Buffer.from("fixed-input")),
        algosdk.encodeUint64(minAmountOut),
      ];

      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        from: account.addr,
        appIndex: pool.validatorAppID,
        appArgs: swapAppArgs,
        accounts: [poolAddress],
        foreignAssets: [pool.asset1ID, pool.asset2ID],
        suggestedParams,
      });

      // Set fee for inner transactions (swap has 2 inner txns)
      appCallTxn.fee = algosdk.ALGORAND_MIN_TX_FEE * 3;

      // Assign group ID
      const txnGroup = algosdk.assignGroupID([inputTxn, appCallTxn]);

      // Sign both transactions
      const signedInputTxn = txnGroup[0].signTxn(account.sk);
      const signedAppCallTxn = txnGroup[1].signTxn(account.sk);

      // Submit the transaction group
      const { txId } = await algodClient.sendRawTransaction([signedInputTxn, signedAppCallTxn]).do();

      // Wait for confirmation
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 5);

      // Clear stored quote after successful execution
      this.currentSwapQuote = null;
      this.currentPool = null;
      this.currentSwapParams = null;

      return {
        txId,
        confirmedRound: confirmedTxn["confirmed-round"],
      };
    } catch (error) {
      console.error("Detailed swap error:", error);
      // Clear stored quote on error
      this.currentSwapQuote = null;
      this.currentPool = null;
      this.currentSwapParams = null;
      throw new Error(`Swap execution failed: ${error}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async searchSwapAssets(query: string): Promise<any[]> {
    try {
      // Use Tinyman Analytics API to search for assets
      const response = await fetch(
        `https://testnet.analytics.tinyman.org/api/v1/assets/?search=${encodeURIComponent(query)}&limit=20`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch assets");
      }

      const data = (await response.json()) as TinymanAssetsResponse;
      const assets = data.results || [];

      // Map to the expected format
      return assets.map((asset) => ({
        asset_id: asset.id,
        name: asset.name || `Asset ${asset.id}`,
        unit_name: asset.unit_name || `ASA${asset.id}`,
        logo: asset.logo?.png || asset.logo?.svg || "",
        fraction_decimals: asset.decimals || 0,
        usd_value: asset.usd_value || null,
        is_verified: asset.is_verified || false,
        verification_tier: asset.is_verified ? ("verified" as const) : ("unverified" as const),
      }));
    } catch (error) {
      console.error("Error searching assets:", error);
      return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  async getAvailableSwapAssets(_assetInId: number): Promise<any[]> {
    try {
      // Fetch popular/verified assets from Tinyman
      const response = await fetch(`https://testnet.analytics.tinyman.org/api/v1/assets/?is_verified=true&limit=50`);

      if (!response.ok) {
        throw new Error("Failed to fetch assets");
      }

      const data = (await response.json()) as TinymanAssetsResponse;
      const assets = data.results || [];

      // Map to the expected format
      return assets.map((asset) => ({
        asset_id: asset.id,
        name: asset.name || `Asset ${asset.id}`,
        unit_name: asset.unit_name || `ASA${asset.id}`,
        logo: asset.logo?.png || asset.logo?.svg || "",
        fraction_decimals: asset.decimals || 0,
        usd_value: asset.usd_value || null,
        is_verified: asset.is_verified || false,
        verification_tier: asset.is_verified ? ("verified" as const) : ("unverified" as const),
      }));
    } catch (error) {
      console.error("Error getting available assets:", error);
      return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getSwapAsset(assetId: number): Promise<any | null> {
    try {
      if (assetId === 0) {
        return {
          asset_id: 0,
          name: "Algorand",
          unit_name: "ALGO",
          logo: "",
          fraction_decimals: 6,
          usd_value: null,
          is_verified: true,
          verification_tier: "verified" as const,
        };
      }

      const response = await fetch(`https://testnet.analytics.tinyman.org/api/v1/assets/${assetId}/`);

      if (!response.ok) {
        return null;
      }

      const asset = (await response.json()) as TinymanAsset;

      return {
        asset_id: asset.id,
        name: asset.name || `Asset ${asset.id}`,
        unit_name: asset.unit_name || `ASA${asset.id}`,
        logo: asset.logo?.png || asset.logo?.svg || "",
        fraction_decimals: asset.decimals || 0,
        usd_value: asset.usd_value || null,
        is_verified: asset.is_verified || false,
        verification_tier: asset.is_verified ? ("verified" as const) : ("unverified" as const),
      };
    } catch (error) {
      console.error("Error getting swap asset:", error);
      return null;
    }
  }

  clearCache(): void {
    this.cachedWallet = null;
  }
}
