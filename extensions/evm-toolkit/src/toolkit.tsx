import {
  Clipboard,
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  List,
  open,
  popToRoot,
  showHUD,
} from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { buildDethUrl, isDethSupported } from "./lib/build-deth-url";
import { buildExplorerUrl } from "./lib/build-explorer-url";
import { detectInputType } from "./lib/detect-input";
import { getDefaultNetworkId } from "./lib/get-default-network-id";
import { NETWORKS } from "./lib/networks";

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
const EIP_REGEX = /^\d{1,5}$/;

// Mirrors package.json data for the metasleuth command.
const METASLEUTH_NETWORKS: { name: string; value: string }[] = [
  { name: "Mainnet", value: "eth" },
  { name: "BSC", value: "bsc" },
  { name: "Arbitrum", value: "arbitrum" },
  { name: "Polygon", value: "polygon" },
  { name: "Optimism", value: "optimism" },
  { name: "Base", value: "base" },
  { name: "Linea", value: "linea" },
  { name: "Avalanche", value: "avalanche" },
  { name: "Mantle", value: "mantle" },
];

// Mirrors package.json data for the bubblemaps command.
const BUBBLEMAPS_NETWORKS: { name: string; value: string }[] = [
  { name: "Mainnet", value: "eth" },
  { name: "Base", value: "base" },
  { name: "BSC", value: "bsc" },
  { name: "Polygon", value: "polygon" },
  { name: "Avalanche", value: "avalanche" },
];

// Map chain ID (string) to MetaSleuth/Bubblemaps slug-style identifiers.
const CHAIN_ID_TO_METASLEUTH: Record<string, string> = {
  "1": "eth",
  "56": "bsc",
  "42161": "arbitrum",
  "137": "polygon",
  "10": "optimism",
  "8453": "base",
  "59144": "linea",
  "43114": "avalanche",
  "5000": "mantle",
};

function useClipboardPrefill(): string | null {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    Clipboard.readText().then((t) => setText(t?.trim() || ""));
  }, []);
  return text;
}

async function openAndClose(url: string) {
  await open(url);
  await closeMainWindow();
  await showHUD("Opened in browser");
}

function ExplorerForm() {
  const clipboard = useClipboardPrefill();
  if (clipboard === null) return <Form isLoading />;
  return <ExplorerFormInner initialInput={clipboard} />;
}

function ExplorerFormInner({ initialInput }: { initialInput: string }) {
  const initialValid = detectInputType(initialInput) !== null;
  const { handleSubmit, itemProps } = useForm<{
    input: string;
    network: string;
  }>({
    async onSubmit(values) {
      const network = NETWORKS.find(
        (n) => String(n.chainId) === values.network,
      );
      if (!network) {
        await showFailureToast("Unknown network");
        return;
      }
      const inputType = detectInputType(values.input);
      if (!inputType) return;
      await openAndClose(buildExplorerUrl(network, inputType, values.input));
    },
    initialValues: {
      input: initialValid ? initialInput : "",
      network: getDefaultNetworkId(),
    },
    validation: {
      input(value) {
        if (!value) return "Required";
        if (!detectInputType(value))
          return "Must be an address (42 chars), tx hash (66 chars), or a block number";
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open Explorer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Address, Tx Hash, or Block"
        placeholder="0x... or block number"
        {...itemProps.input}
      />
      <Form.Dropdown title="Network" {...itemProps.network}>
        {NETWORKS.map((n) => (
          <Form.Dropdown.Item
            key={n.chainId}
            title={n.name}
            value={String(n.chainId)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function CodeForm() {
  const clipboard = useClipboardPrefill();
  if (clipboard === null) return <Form isLoading />;
  return <CodeFormInner initialInput={clipboard} />;
}

function CodeFormInner({ initialInput }: { initialInput: string }) {
  const supportedNetworks = NETWORKS.filter(isDethSupported);
  const initialValid = ADDRESS_REGEX.test(initialInput);
  const defaultId = getDefaultNetworkId();
  const fallbackNetwork = supportedNetworks.some(
    (n) => String(n.chainId) === defaultId,
  )
    ? defaultId
    : String(supportedNetworks[0].chainId);

  const { handleSubmit, itemProps } = useForm<{
    input: string;
    network: string;
  }>({
    async onSubmit(values) {
      const network = supportedNetworks.find(
        (n) => String(n.chainId) === values.network,
      );
      if (!network) {
        await showFailureToast("Unknown network");
        return;
      }
      await openAndClose(buildDethUrl(network, values.input));
    },
    initialValues: {
      input: initialValid ? initialInput : "",
      network: fallbackNetwork,
    },
    validation: {
      input(value) {
        if (!value) return "Required";
        if (!ADDRESS_REGEX.test(value))
          return "Must be a contract address (0x + 40 hex characters)";
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open Code" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Contract Address"
        placeholder="0x..."
        {...itemProps.input}
      />
      <Form.Dropdown title="Network" {...itemProps.network}>
        {supportedNetworks.map((n) => (
          <Form.Dropdown.Item
            key={n.chainId}
            title={n.name}
            value={String(n.chainId)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function MetaSleuthForm() {
  const clipboard = useClipboardPrefill();
  if (clipboard === null) return <Form isLoading />;
  return <MetaSleuthFormInner initialInput={clipboard} />;
}

function MetaSleuthFormInner({ initialInput }: { initialInput: string }) {
  const initialValid = ADDRESS_REGEX.test(initialInput);
  const { handleSubmit, itemProps } = useForm<{
    input: string;
    network: string;
  }>({
    async onSubmit(values) {
      await openAndClose(
        `https://metasleuth.io/result/${values.network}/${values.input}`,
      );
    },
    initialValues: {
      input: initialValid ? initialInput : "",
      network: CHAIN_ID_TO_METASLEUTH[getDefaultNetworkId()] ?? "eth",
    },
    validation: {
      input(value) {
        if (!value) return "Required";
        if (!ADDRESS_REGEX.test(value))
          return "Must be an account address (0x + 40 hex characters)";
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open MetaSleuth Intel"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Account Address"
        placeholder="0x..."
        {...itemProps.input}
      />
      <Form.Dropdown title="Network" {...itemProps.network}>
        {METASLEUTH_NETWORKS.map((n) => (
          <Form.Dropdown.Item key={n.value} title={n.name} value={n.value} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function BubblemapsForm() {
  const clipboard = useClipboardPrefill();
  if (clipboard === null) return <Form isLoading />;
  return <BubblemapsFormInner initialInput={clipboard} />;
}

function BubblemapsFormInner({ initialInput }: { initialInput: string }) {
  const initialValid = ADDRESS_REGEX.test(initialInput);
  const { handleSubmit, itemProps } = useForm<{
    input: string;
    network: string;
  }>({
    async onSubmit(values) {
      await openAndClose(
        `https://v2.bubblemaps.io/map?address=${values.input}&chain=${values.network}`,
      );
    },
    initialValues: {
      input: initialValid ? initialInput : "",
      network: CHAIN_ID_TO_METASLEUTH[getDefaultNetworkId()] ?? "eth",
    },
    validation: {
      input(value) {
        if (!value) return "Required";
        if (!ADDRESS_REGEX.test(value))
          return "Must be an account address (0x + 40 hex characters)";
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open Bubblemaps Intel"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Account Address"
        placeholder="0x..."
        {...itemProps.input}
      />
      <Form.Dropdown title="Network" {...itemProps.network}>
        {BUBBLEMAPS_NETWORKS.map((n) => (
          <Form.Dropdown.Item key={n.value} title={n.name} value={n.value} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function EipForm() {
  const { handleSubmit, itemProps } = useForm<{ eip: string }>({
    async onSubmit(values) {
      try {
        await launchCommand({
          name: "eip",
          type: LaunchType.UserInitiated,
          arguments: { eip: values.eip },
        });
        await popToRoot();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to launch Open EIP" });
      }
    },
    validation: {
      eip(value) {
        if (!value) return "Required";
        if (!EIP_REGEX.test(value))
          return "Enter a valid EIP number (1 to 5 digits)";
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open EIP" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="EIP Number"
        placeholder="e.g. 4626"
        {...itemProps.eip}
      />
    </Form>
  );
}

async function runCommand(name: string) {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: `Failed to launch ${name}` });
  }
}

type HubCommand = {
  name: string;
  title: string;
  subtitle: string;
  icon: Icon;
  form?: () => NonNullable<Parameters<typeof Action.Push>[0]["target"]>;
};

const SECTIONS: { title: string; items: HubCommand[] }[] = [
  {
    title: "Explore",
    items: [
      {
        name: "explorer",
        title: "Open Explorer",
        subtitle:
          "Open an address, transaction, or block in the chain's block explorer",
        icon: Icon.MagnifyingGlass,
        form: () => <ExplorerForm />,
      },
      {
        name: "code",
        title: "Open Code",
        subtitle: "Open a contract's source code in a web IDE via deth.net",
        icon: Icon.Code,
        form: () => <CodeForm />,
      },
      {
        name: "repository",
        title: "Open Editor",
        subtitle: "Open a GitHub repository in a web IDE",
        icon: Icon.Pencil,
      },
    ],
  },
  {
    title: "Intel",
    items: [
      {
        name: "arkham",
        title: "Open Arkham Intel",
        subtitle: "Open an address in Arkham Intelligence explorer",
        icon: Icon.Eye,
      },
      {
        name: "metasleuth",
        title: "Open MetaSleuth Intel",
        subtitle: "Open an address in MetaSleuth blockchain explorer",
        icon: Icon.Footprints,
        form: () => <MetaSleuthForm />,
      },
      {
        name: "bubblemaps",
        title: "Open Bubblemaps Intel",
        subtitle: "Open an address in Bubblemaps token holder visualization",
        icon: Icon.CircleFilled,
        form: () => <BubblemapsForm />,
      },
    ],
  },
  {
    title: "Profiles",
    items: [
      {
        name: "debank",
        title: "Open DeBank Profile",
        subtitle: "Open an address's portfolio page on DeBank",
        icon: Icon.PersonCircle,
      },
      {
        name: "zerion",
        title: "Open Zerion Profile",
        subtitle: "Open an address's portfolio page on Zerion",
        icon: Icon.PersonCircle,
      },
    ],
  },
  {
    title: "Tools",
    items: [
      {
        name: "simulate",
        title: "Simulate Transaction",
        subtitle: "Open a prefilled Tenderly simulation page for a transaction",
        icon: Icon.Play,
      },
    ],
  },
  {
    title: "Reference",
    items: [
      {
        name: "eip",
        title: "Open EIP",
        subtitle: "Open an Ethereum Improvement Proposal by its number",
        icon: Icon.Document,
        form: () => <EipForm />,
      },
    ],
  },
];

export default function Command() {
  return (
    <List searchBarPlaceholder="Search commands...">
      {SECTIONS.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.items.map((item) => (
            <List.Item
              key={item.name}
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
              actions={
                <ActionPanel>
                  {item.form ? (
                    <Action.Push
                      title={item.title}
                      icon={item.icon}
                      target={item.form()}
                    />
                  ) : (
                    <Action
                      title={`Run ${item.title}`}
                      icon={Icon.ArrowRight}
                      onAction={() => runCommand(item.name)}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
