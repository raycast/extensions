import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  closeMainWindow,
  open,
  showHUD,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { buildTenderlyUrl } from "./lib/build-tenderly-url";
import { getDefaultNetworkId } from "./lib/get-default-network-id";
import { NETWORKS } from "./lib/networks";

interface FormValues {
  to: string;
  calldata: string;
  from: string;
  value: string;
  network: string;
}

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
const HEX_REGEX = /^0x[0-9a-fA-F]*$/;
const DIGITS_REGEX = /^[0-9]+$/;

function parseClipboard(text: string | undefined): {
  to: string;
  calldata: string;
} {
  const trimmed = text?.trim() || "";

  if (ADDRESS_REGEX.test(trimmed)) {
    return { to: trimmed, calldata: "" };
  }

  if (HEX_REGEX.test(trimmed) && trimmed.length > 2 && trimmed.length !== 66) {
    return { to: "", calldata: trimmed };
  }

  return { to: "", calldata: "" };
}

function SimulateForm({
  prefill,
}: {
  prefill: { to: string; calldata: string };
}) {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const url = buildTenderlyUrl({
        chainId: Number(values.network),
        to: values.to,
        calldata: values.calldata,
        from: values.from || undefined,
        value: values.value || undefined,
      });
      await open(url);
      await closeMainWindow();
      await showHUD("Opened in browser");
    },
    initialValues: {
      to: prefill.to,
      calldata: prefill.calldata,
      network: getDefaultNetworkId(),
    },
    validation: {
      to(value) {
        if (!value) return "Required";
        if (!ADDRESS_REGEX.test(value))
          return "Must be a valid address (0x + 40 hex characters)";
      },
      calldata(value) {
        if (!value) return "Required";
        if (!HEX_REGEX.test(value))
          return "Must be valid hex data starting with 0x";
      },
      from(value) {
        if (value && !ADDRESS_REGEX.test(value))
          return "Must be a valid address (0x + 40 hex characters)";
      },
      value(value) {
        if (value && !DIGITS_REGEX.test(value))
          return "Must be a numeric value (wei)";
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open Simulation" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Target Address"
        placeholder="0x..."
        {...itemProps.to}
      />
      <Form.TextArea
        title="Calldata"
        placeholder="0x..."
        {...itemProps.calldata}
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
      <Form.Separator />
      <Form.TextField
        title="From Address"
        placeholder="0x... (optional)"
        {...itemProps.from}
      />
      <Form.TextField
        title="Value (wei)"
        placeholder="0 (optional)"
        {...itemProps.value}
      />
    </Form>
  );
}

export default function Command() {
  const [prefill, setPrefill] = useState<{
    to: string;
    calldata: string;
  } | null>(null);

  useEffect(() => {
    Clipboard.readText().then((text) => setPrefill(parseClipboard(text)));
  }, []);

  if (!prefill) return <Form isLoading />;
  return <SimulateForm prefill={prefill} />;
}
