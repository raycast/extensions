export const NOCTRUM_SERVER_URL = "https://server-production-291b.up.railway.app";
export const RPC_URL = "https://testnet-rpc.monad.xyz";

export const CHAIN_ID = 10143;
export const VAULT_ADDRESS = "0x65877F6BFd3f2D293454658BCb290b112397Eeb5";
export const EXTERNAL_API = "https://vault-api-production-30bb.up.railway.app";

export const nUSD = "0x339a948f3667d222FAD43d313b3b8c3BE1415ad5";
export const nETH = "0x39AD31E31b8b202E6Fa7BD8682E68aC4e66cE92A";
export const CRE_PUBKEY = "03a62ca0efd28497d24e1cc2dc587f8e7e20ebc3de0c2315778997ead8bedda649";

export const COINS = [
  { symbol: "nUSD", name: "Noctrum USD", address: nUSD },
  { symbol: "nETH", name: "Noctrum ETH", address: nETH },
] as const;

export const tokenName = (addr: string | undefined) => {
  if (!addr) return "???";
  return COINS.find((c) => c.address.toLowerCase() === addr.toLowerCase())?.symbol ?? addr.slice(0, 10);
};

export const tokenIcon = (addr: string | undefined) => (tokenName(addr) === "nUSD" ? "nusd.png" : "neth.png");

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
];

export const VAULT_ABI = [
  "function deposit(address token, uint256 amount)",
  "function withdrawWithTicket(address token, uint256 amount, bytes ticket)",
];

export const NOCTRUM_DOMAIN = {
  name: "NoctrumProtocol",
  version: "0.0.1",
  chainId: CHAIN_ID,
  verifyingContract: VAULT_ADDRESS,
};

export const EXTERNAL_DOMAIN = {
  name: "NoctrumPrivateToken",
  version: "0.0.1",
  chainId: CHAIN_ID,
  verifyingContract: VAULT_ADDRESS,
};

// EIP-712 types for NOCTRUM server endpoints
export const CONFIRM_DEPOSIT_TYPES = {
  "Confirm Deposit": [
    { name: "account", type: "address" },
    { name: "slotId", type: "string" },
    { name: "encryptedRate", type: "string" },
    { name: "timestamp", type: "uint256" },
  ],
};

export const CANCEL_LEND_TYPES = {
  "Cancel Lend": [
    { name: "account", type: "address" },
    { name: "slotId", type: "string" },
    { name: "timestamp", type: "uint256" },
  ],
};

export const BORROW_TYPES = {
  "Submit Borrow": [
    { name: "account", type: "address" },
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "collateralToken", type: "address" },
    { name: "collateralAmount", type: "uint256" },
    { name: "encryptedMaxRate", type: "string" },
    { name: "timestamp", type: "uint256" },
  ],
};

export const CANCEL_BORROW_TYPES = {
  "Cancel Borrow": [
    { name: "account", type: "address" },
    { name: "intentId", type: "string" },
    { name: "timestamp", type: "uint256" },
  ],
};

export const ACCEPT_PROPOSAL_TYPES = {
  "Accept Proposal": [
    { name: "account", type: "address" },
    { name: "proposalId", type: "string" },
    { name: "timestamp", type: "uint256" },
  ],
};

export const REJECT_PROPOSAL_TYPES = {
  "Reject Proposal": [
    { name: "account", type: "address" },
    { name: "proposalId", type: "string" },
    { name: "timestamp", type: "uint256" },
  ],
};

export const REPAY_LOAN_TYPES = {
  "Repay Loan": [
    { name: "account", type: "address" },
    { name: "loanId", type: "string" },
    { name: "amount", type: "uint256" },
    { name: "timestamp", type: "uint256" },
  ],
};

export const CLAIM_EXCESS_COLLATERAL_TYPES = {
  "Claim Excess Collateral": [
    { name: "account", type: "address" },
    { name: "loanId", type: "string" },
    { name: "timestamp", type: "uint256" },
  ],
};

// EIP-712 types for EXTERNAL API endpoints
export const PRIVATE_TRANSFER_TYPES = {
  "Private Token Transfer": [
    { name: "sender", type: "address" },
    { name: "recipient", type: "address" },
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "flags", type: "string[]" },
    { name: "timestamp", type: "uint256" },
  ],
};

export const BALANCE_TYPES = {
  "Retrieve Balances": [
    { name: "account", type: "address" },
    { name: "timestamp", type: "uint256" },
  ],
};

export const WITHDRAW_TYPES = {
  "Withdraw Tokens": [
    { name: "account", type: "address" },
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "timestamp", type: "uint256" },
  ],
};

export const SHIELDED_ADDRESS_TYPES = {
  "Generate Shielded Address": [
    { name: "account", type: "address" },
    { name: "timestamp", type: "uint256" },
  ],
};

export const TRANSACTION_TYPES = {
  "List Transactions": [
    { name: "account", type: "address" },
    { name: "timestamp", type: "uint256" },
    { name: "cursor", type: "string" },
    { name: "limit", type: "uint256" },
  ],
};
