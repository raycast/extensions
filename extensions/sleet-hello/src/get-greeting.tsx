import { useState, useEffect } from "react";
import { ActionPanel, Detail, Action, Clipboard } from "@raycast/api";
import { getNetworkConfig } from "./utils/config";
import { connect, Contract } from "near-api-js";

const GetGreeting = () => {
  const [greeting, setGreeting] = useState<string>("");
  const [contractName, setContractName] = useState<string>("");
  const [networkId, setNetworkId] = useState<string>("");

  const [nodeUrl, setNodeUrl] = useState<string>("");

  const refreshGreeting = async () => {
    const { nodeUrl, contractName, networkId } = await getNetworkConfig();
    setContractName(contractName);
    setNetworkId(networkId);
    setNodeUrl(nodeUrl);

    const near = await connect({ nodeUrl, networkId });
    const account = await near.account(contractName);
    interface GreetingContract extends Contract {
      get_greeting(): Promise<string>;
    }
    const contract = new Contract(account, contractName, {
      viewMethods: ["get_greeting"],
      changeMethods: [],
      useLocalViewExecution: true,
    }) as GreetingContract;

    const greeting = await contract.get_greeting();
    setGreeting(greeting);
  };

  useEffect(() => {
    refreshGreeting();
  }, []);

  const markdown = `
# Sleet Greeting

## Current Greeting
${greeting}

## Details
- **Contract Name:** ${contractName}
- **Network:** ${networkId}
- **RPC Endpoint:** ${nodeUrl}

## NEAR CLI Command
\`near view ${contractName} get_greeting --networkId ${networkId}\`

---
*Click the refresh button to update the greeting or copy the CLI command to interact via terminal*
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh Greeting" onAction={refreshGreeting} />
          <Action
            title="Copy Near Cli Command"
            onAction={() => Clipboard.copy(`near view ${contractName} get_greeting --networkId ${networkId}`)}
          />
        </ActionPanel>
      }
    />
  );
};

export default GetGreeting;
