export type ExplorerType = "etherscan" | "blockscout" | "zksync" | "snowtrace";

export type InputType = "address" | "tx" | "block";

interface RouteTemplates {
  address: string;
  tx: string;
  block: string;
}

export const ROUTE_TEMPLATES: Record<ExplorerType, RouteTemplates> = {
  etherscan: {
    address: "/address/{value}",
    tx: "/tx/{value}",
    block: "/block/{value}",
  },
  blockscout: {
    address: "/address/{value}",
    tx: "/tx/{value}",
    block: "/block/{value}",
  },
  zksync: {
    address: "/address/{value}",
    tx: "/tx/{value}",
    block: "/batch/{value}",
  },
  snowtrace: {
    address: "/address/{value}",
    tx: "/tx/{value}",
    block: "/block/{value}",
  },
};
