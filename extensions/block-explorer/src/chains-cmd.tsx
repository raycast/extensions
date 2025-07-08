import {
  List,
  ActionPanel,
  Action,
  Icon,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
  Form,
} from "@raycast/api";
import { chains, ChainConfig } from "./chains";
import { useState, useEffect } from "react";
import { useForm, FormValidation } from "@raycast/utils";

interface ChainFormValues {
  id: string;
  name: string;
  explorer_host: string;
  logo?: string;
}

function ChainForm({
  existingChain,
  isEdit = false,
  onChainUpdate,
}: {
  existingChain?: { id: string; config: ChainConfig };
  isEdit?: boolean;
  onChainUpdate: () => void;
}) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ChainFormValues>({
    async onSubmit(values) {
      try {
        // Get existing custom chains
        const customChainsStr =
          await LocalStorage.getItem<string>("custom-chains");
        const customChains = customChainsStr ? JSON.parse(customChainsStr) : {};

        // Add or update the chain
        customChains[values.id] = {
          name: values.name,
          explorer_host: values.explorer_host,
          logo: values.logo,
        };

        await LocalStorage.setItem(
          "custom-chains",
          JSON.stringify(customChains),
        );

        await showToast({
          style: Toast.Style.Success,
          title: isEdit ? "Chain Updated" : "Chain Added",
          message: `${values.name} has been ${isEdit ? "updated" : "added"} successfully`,
        });

        onChainUpdate(); // Trigger refresh in parent component
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: error instanceof Error ? error.message : "An error occurred",
        });
      }
    },
    initialValues: existingChain
      ? {
          id: existingChain.id,
          name: existingChain.config.name,
          explorer_host: existingChain.config.explorer_host,
          logo: existingChain.config.logo,
        }
      : undefined,
    validation: {
      id: (value) => {
        if (!value) return "Chain ID is required";
        if (!isEdit && chains[value])
          return "Chain ID already exists in built-in chains";
        return undefined;
      },
      name: FormValidation.Required,
      explorer_host: (value) => {
        if (!value) return "Explorer URL is required";
        try {
          new URL(value);
          return undefined;
        } catch {
          return "Please enter a valid URL";
        }
      },
    },
  });

  return (
    <Form
      navigationTitle={isEdit ? "Edit Chain" : "Add Custom Chain"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Update Chain" : "Add Chain"}
            onSubmit={handleSubmit}
          />
          <Action title="Cancel" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Chain ID"
        placeholder="e.g. mychain"
        {...itemProps.id}
        info="Unique identifier for the chain"
      />
      <Form.TextField
        title="Chain Name"
        placeholder="e.g. My Custom Chain"
        {...itemProps.name}
      />
      <Form.TextField
        title="Explorer URL"
        placeholder="https://explorer.mychain.com"
        {...itemProps.explorer_host}
      />
      <Form.TextField
        title="Logo URL (Optional)"
        placeholder="https://example.com/logo.png"
        {...itemProps.logo}
      />
    </Form>
  );
}

export default function Command() {
  const [defaultChain, setDefaultChain] = useState<string>("eth");
  const [customChains, setCustomChains] = useState<Record<string, ChainConfig>>(
    {},
  );
  const { push } = useNavigation();

  const loadData = async () => {
    // Load custom chains first
    const customChainsStr = await LocalStorage.getItem<string>("custom-chains");
    const loadedCustomChains = customChainsStr
      ? JSON.parse(customChainsStr)
      : {};
    setCustomChains(loadedCustomChains);

    // Load default chain
    const storedChain = await LocalStorage.getItem<string>("default-chain");
    if (
      storedChain &&
      (chains[storedChain] || loadedCustomChains[storedChain])
    ) {
      setDefaultChain(storedChain);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Combine built-in and custom chains
  const allChains = { ...chains, ...customChains };

  const handleSetDefault = async (chainId: string) => {
    await LocalStorage.setItem("default-chain", chainId);
    setDefaultChain(chainId);
    await showToast({
      style: Toast.Style.Success,
      title: "Default Chain Updated",
      message: `${allChains[chainId].name} is now your default chain`,
    });
  };

  const handleDeleteCustomChain = async (chainId: string) => {
    const updatedCustomChains = { ...customChains };
    delete updatedCustomChains[chainId];

    await LocalStorage.setItem(
      "custom-chains",
      JSON.stringify(updatedCustomChains),
    );
    setCustomChains(updatedCustomChains);

    // If this was the default chain, reset to eth
    if (defaultChain === chainId) {
      await LocalStorage.setItem("default-chain", "eth");
      setDefaultChain("eth");
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Chain Deleted",
      message: `${chainId} has been removed`,
    });
  };
  return (
    <List
      navigationTitle="Blockchain Explorers"
      searchBarPlaceholder="Search chains..."
      actions={
        <ActionPanel>
          <Action
            title="Add Custom Chain"
            onAction={() => push(<ChainForm onChainUpdate={loadData} />)}
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    >
      {Object.entries(allChains)
        .sort(([chainIdA], [chainIdB]) => {
          // Sort default chain to the top
          if (chainIdA === defaultChain) return -1;
          if (chainIdB === defaultChain) return 1;
          return 0;
        })
        .map(([chainId, chainConfig]) => {
          const isCustomChain = !chains[chainId];
          const isBuiltInChain = chains[chainId];

          return (
            <List.Item
              key={chainId}
              title={`${chainConfig.name}${chainId === defaultChain ? " ⭐" : ""}${isCustomChain ? " (Custom)" : ""}`}
              subtitle={`Chain ID: ${chainId}`}
              icon={{ source: chainConfig.logo }}
              accessories={[{ text: chainConfig.explorer_host }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Explorer"
                    url={chainConfig.explorer_host}
                    icon={Icon.Globe}
                  />
                  <Action
                    title="Set as Default Chain"
                    onAction={() => handleSetDefault(chainId)}
                    icon={Icon.Star}
                  />
                  {isBuiltInChain && (
                    <Action
                      title="Edit Explorer URL"
                      onAction={() =>
                        push(
                          <ChainForm
                            existingChain={{ id: chainId, config: chainConfig }}
                            isEdit={true}
                            onChainUpdate={loadData}
                          />,
                        )
                      }
                      icon={Icon.Pencil}
                    />
                  )}
                  {isCustomChain && (
                    <>
                      <Action
                        title="Edit Chain"
                        onAction={() =>
                          push(
                            <ChainForm
                              existingChain={{
                                id: chainId,
                                config: chainConfig,
                              }}
                              isEdit={true}
                              onChainUpdate={loadData}
                            />,
                          )
                        }
                        icon={Icon.Pencil}
                      />
                      <Action
                        title="Delete Chain"
                        onAction={() => handleDeleteCustomChain(chainId)}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                      />
                    </>
                  )}
                  <Action
                    title="Add Custom Chain"
                    onAction={() =>
                      push(<ChainForm onChainUpdate={loadData} />)
                    }
                    icon={Icon.Plus}
                  />
                  <Action.CopyToClipboard
                    title="Copy Chain ID"
                    content={chainId}
                    icon={Icon.CopyClipboard}
                  />
                  <Action.CopyToClipboard
                    title="Copy Explorer URL"
                    content={chainConfig.explorer_host}
                    icon={Icon.Link}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
