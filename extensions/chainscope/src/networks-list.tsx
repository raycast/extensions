import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useRef, useState } from "react";
import { builtInChain, CHAINS, getChain, type CustomChainInput } from "./lib/chains";
import { testEvmRpc } from "./lib/evm";
import { getSettings, saveSettings, type Settings } from "./lib/prefs";
import { chainError } from "./lib/settings-model";

function isUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

// Empty means use the default.
function urlError(value: string): string | undefined {
  return value.trim() && !isUrl(value.trim()) ? "Enter a full http(s) URL" : undefined;
}

function cleanUrl(value: string): string | undefined {
  return value.trim().replace(/\/$/, "") || undefined;
}

function host(url?: string): string {
  try {
    return url ? new URL(url).host : "";
  } catch {
    return url ?? "";
  }
}

async function runRpcTest(url: string, expectedChainId?: number): Promise<void> {
  if (!isUrl(url)) {
    await showToast({ style: Toast.Style.Failure, title: "Enter a full http(s) URL" });
    return;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: "Testing connection…" });
  try {
    const { chainId, ms } = await testEvmRpc(url);
    const wrongChain = expectedChainId !== undefined && chainId !== expectedChainId;
    toast.style = wrongChain ? Toast.Style.Failure : Toast.Style.Success;
    toast.title = wrongChain ? `Wrong network: this RPC serves ${chainId}, not ${expectedChainId}` : "Connected";
    toast.message = wrongChain ? undefined : `Network ${chainId} · ${ms} ms`;
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Connection failed";
    toast.message = (e as Error).message.split("\n")[0];
  }
}

// Unreachable may just mean private, so the user decides.
async function rpcLooksRight(url: string, expected: number): Promise<boolean> {
  if (!url) return true;
  const toast = await showToast({ style: Toast.Style.Animated, title: "Checking RPC…" });
  try {
    const { chainId } = await testEvmRpc(url);
    if (chainId === expected) return true;
    toast.style = Toast.Style.Failure;
    toast.title = `This RPC is for network ${chainId}, not ${expected}`;
    return false;
  } catch {
    await toast.hide();
    return confirmAlert({
      title: "Couldn't reach this RPC",
      message: "Save it anyway? It may only work on your own network or VPN.",
      primaryAction: { title: "Save Anyway" },
    });
  }
}

type Update = (next: Settings) => Promise<void>;

const EMPTY = { id: "", name: "", rpc: "", symbol: "", explorer: "", blockscout: "" };

function NetworkForm({ existing, onSave }: { existing?: CustomChainInput; onSave: Update }) {
  const { pop } = useNavigation();
  const idField = useRef<Form.TextField>(null);
  const [v, setV] = useState(
    existing
      ? {
          id: String(existing.id),
          name: existing.name ?? "",
          rpc: existing.rpc ?? "",
          symbol: existing.symbol ?? "",
          explorer: existing.explorer ?? "",
          blockscout: existing.blockscout ?? "",
        }
      : EMPTY,
  );
  const field = (key: keyof typeof EMPTY) => ({
    id: key,
    value: v[key],
    onChange: (value: string) => setV((old) => ({ ...old, [key]: value })),
  });
  const [more, setMore] = useState(!!(existing?.explorer || existing?.blockscout));
  const chainId = Number(v.id);
  const validId = Number.isInteger(chainId) && chainId > 0;
  const known = validId ? builtInChain(chainId) : undefined;

  async function save(): Promise<boolean> {
    const s = getSettings();
    const error =
      chainError({ id: chainId, name: v.name, rpc: v.rpc, symbol: v.symbol }, s.chains, !!known, existing?.id) ||
      urlError(v.rpc) ||
      urlError(v.explorer) ||
      urlError(v.blockscout);
    if (error) {
      await showToast({ style: Toast.Style.Failure, title: error });
      return false;
    }
    if (!(await rpcLooksRight(v.rpc.trim(), chainId))) return false;
    const entry: CustomChainInput = {
      id: chainId,
      name: v.name.trim() || undefined,
      rpc: cleanUrl(v.rpc),
      explorer: more ? cleanUrl(v.explorer) : undefined,
      symbol: v.symbol.trim() || undefined,
      blockscout: more ? cleanUrl(v.blockscout) : undefined,
    };
    await onSave({
      ...s,
      chains: [...s.chains.filter((c) => c.id !== existing?.id), entry],
      defaultChainId: s.defaultChainId === existing?.id ? chainId : s.defaultChainId,
    });
    return true;
  }

  return (
    <Form
      navigationTitle={existing ? getChain(existing.id).name : "Add Network"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={async () => {
              if (await save()) pop();
            }}
          />
          {existing ? null : (
            <Action.SubmitForm
              title="Save and Add Another"
              icon={Icon.PlusCircle}
              onSubmit={async () => {
                if (!(await save())) return;
                setV(EMPTY);
                setMore(false);
                idField.current?.focus();
              }}
            />
          )}
          <Action
            title="Test Connection"
            icon={Icon.Plug}
            shortcut={existing ? undefined : { modifiers: ["cmd"], key: "t" }}
            onAction={() =>
              runRpcTest(v.rpc.trim() || (validId ? getChain(chainId).defaultRpc : ""), validId ? chainId : undefined)
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...field("id")}
        ref={idField}
        title="Network ID"
        placeholder="324"
        info="Use a built-in network's ID to change its details, or a new ID to add a network."
      />
      <Form.Description
        text={
          known
            ? `Built in: ${known.name}. Leave a field blank to keep its default.`
            : "Name, RPC URL, and Network Token are required."
        }
      />
      <Form.TextField {...field("name")} title="Name" placeholder={known?.name ?? "My Network"} />
      <Form.TextField {...field("rpc")} title="RPC URL" placeholder={known?.defaultRpc || "https://rpc.example.com"} />
      <Form.TextField
        {...field("symbol")}
        title="Network Token"
        placeholder={known?.chain.nativeCurrency.symbol ?? "ETH"}
      />
      <Form.Separator />
      <Form.Checkbox
        id="more"
        label="Add an explorer or contract lookup"
        info="Optional. Gives this network explorer links and verified contract names."
        value={more}
        onChange={setMore}
      />
      {more ? (
        <Form.TextField
          {...field("explorer")}
          title="Explorer URL"
          placeholder={known?.explorer || "https://explorer.example.com"}
        />
      ) : null}
      {more ? (
        <Form.TextField
          {...field("blockscout")}
          title="Blockscout URL"
          placeholder={known?.blockscout || "https://blockscout.example.com"}
        />
      ) : null}
    </Form>
  );
}

export function NetworksList() {
  const [s, setS] = useState(getSettings());
  const save: Update = async (next) => {
    await saveSettings(next);
    setS(next);
    await showToast({ style: Toast.Style.Success, title: "Network saved" });
  };

  async function remove(c: CustomChainInput) {
    const confirmed = await confirmAlert({
      title: `Remove ${getChain(c.id).name}?`,
      message: builtInChain(c.id)
        ? "It goes back to its built-in details."
        : "ChainScope will stop using this network.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await save({
      ...s,
      chains: s.chains.filter((x) => x.id !== c.id),
      defaultChainId: s.defaultChainId === c.id && !builtInChain(c.id) ? 1 : s.defaultChainId,
    });
  }

  const addAction = <Action.Push title="Add Network" icon={Icon.Plus} target={<NetworkForm onSave={save} />} />;

  function row(id: number, saved?: CustomChainInput) {
    const chain = getChain(id);
    const isDefault = s.defaultChainId === id;
    return (
      <List.Item
        key={id}
        icon={saved ? { source: Icon.Link, tintColor: Color.Purple } : Icon.Link}
        title={chain.name}
        subtitle={`ID ${id} · ${chain.chain.nativeCurrency.symbol}`}
        accessories={[
          ...(isDefault ? [{ tag: { value: "Default", color: Color.Green } }] : []),
          { text: host(chain.defaultRpc) },
        ]}
        keywords={[String(id), chain.chain.nativeCurrency.symbol]}
        actions={
          <ActionPanel>
            <Action.Push
              title={saved ? "Edit Network" : "Set RPC and Details"}
              icon={Icon.Pencil}
              target={<NetworkForm existing={saved ?? { id }} onSave={save} />}
            />
            {addAction}
            <Action
              title="Test Connection"
              icon={Icon.Plug}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() => runRpcTest(chain.defaultRpc, id)}
            />
            {isDefault ? null : (
              <Action
                title="Make Default"
                icon={Icon.Star}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => save({ ...s, defaultChainId: id })}
              />
            )}
            {saved ? (
              <Action
                title={builtInChain(id) ? "Reset to Built-in Details" : "Remove Network"}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => remove(saved)}
              />
            ) : null}
          </ActionPanel>
        }
      />
    );
  }

  const savedIds = new Set(s.chains.map((c) => c.id));

  return (
    <List searchBarPlaceholder="Search networks by name, ID, or token">
      <List.EmptyView
        icon={Icon.Network}
        title="Network not found"
        description="Press Enter to add it."
        actions={<ActionPanel>{addAction}</ActionPanel>}
      />
      <List.Item icon={Icon.Plus} title="Add Network" actions={<ActionPanel>{addAction}</ActionPanel>} />
      {s.chains.length > 0 ? (
        <List.Section title="Your Networks" subtitle={String(s.chains.length)}>
          {s.chains.map((c) => row(c.id, c))}
        </List.Section>
      ) : null}
      <List.Section title="Built-in Networks" subtitle="Press Enter to use your own RPC">
        {Object.values(CHAINS)
          .filter((c) => !savedIds.has(c.id))
          .map((c) => row(c.id))}
      </List.Section>
    </List>
  );
}
