const NETWORK_CONFIG = {
  polygon: {
    name: "Polygon",
    chainId: "137",
    scanBaseUrl: "api.polygonscan.com",
    scanApiKey: process.env.REACT_APP_POLYGON_SCAN_API_KEY,
    image: "https://polygon-mainnet.g.alchemy.com/v2/seIUYsCMXIFGP8u8qjq-LtPI4Sw3Tl9q",
    type: "evm",
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: "42161",
    scanBaseUrl: "api.arbiscan.io",
    scanApiKey: process.env.REACT_APP_ABITRRUM_SCAN_API_KEY,
    image: "https://dnj9s9rkg1f49.cloudfront.net/arbitrum_logo.png",
    type: "evm",
  },
  optimism: {
    name: "Optimism",
    chainId: "10",
    scanBaseUrl: "api-optimistic.etherscan.io",
    scanApiKey: process.env.REACT_APP_OPTIMISM_SCAN_API_KEY,
    image: "https://assets.coingecko.com/coins/images/25244/large/Optimism.png?1660904599",
    type: "evm",
  },
  ethereum: {
    name: "Ethereum",
    chainId: "1",
    scanBaseUrl: "api.etherscan.io",
    scanApiKey: process.env.REACT_APP_ETHEREUM_SCAN_API_KEY,
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png?1595348880",
    type: "evm",
  },
  starknet_goerli: {
    name: "Starknet",
    chainId: "0x534e5f474f45524c49", //SN_GOERLI
    scanBaseUrl: "testnet.starkscan.co",
    scanApiKey: "",
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png?1595348880",
    type: "cvm",
    sequencerNetwork: "SN_GOERLI",
  },
  starknet_main: {
    name: "Starknet",
    chainId: "0x534e5f4d41494e", //SN_MAINNET
    scanBaseUrl: "starkscan.co",
    scanApiKey: "",
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png?1595348880",
    type: "cvm",
    sequencerNetwork: "SN_MAIN",
  },
  solana_mainnet: {
    name: "Solana",
    chainId: "", //SN_MAINNET
    scanBaseUrl: "solscan.io",
    scanApiKey: "",
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png?1595348880",
    type: "solana",
  },
};

export default NETWORK_CONFIG;
