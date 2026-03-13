export type SearchResult = {
  data: {
    search: {
      node_results: {
        results: Array<NodeResult>;
      };
    };
  };
};

export type NodeResult = {
  alias: string;
  pubkey: string;
  channel_amount: number;
  capacity: number;
};
