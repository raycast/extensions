import { getPreferenceValues } from "@raycast/api";
import { useMemo } from "react";
import type { Preferences } from "../type";
import { createVercelAITools, SolanaAgentKit, KeypairWallet } from "solana-agent-kit";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import TokenPlugin from "@solana-agent-kit/plugin-token";

export default function useAgentKit() {
  const preferences = getPreferenceValues<Preferences>();

  const agentKit = useMemo(() => {
    const keypair = Keypair.fromSecretKey(bs58.decode(preferences.privateKey));
    const wallet = new KeypairWallet(keypair, preferences.rpcUrl);
    return new SolanaAgentKit(wallet, preferences.rpcUrl, {
      OPENAI_API_KEY: preferences.apiKey,
    }).use(TokenPlugin);
  }, [preferences.apiKey, preferences.privateKey, preferences.rpcUrl]);

  const tools = useMemo(() => createVercelAITools(agentKit, agentKit.actions), [agentKit]);

  return { agentKit, tools };
}
