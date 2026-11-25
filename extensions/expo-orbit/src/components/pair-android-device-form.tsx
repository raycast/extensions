import { Action, ActionPanel, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { pairWithCode, pairWithQrCode } from "../lib/pairing";

type Values = {
  pairingAddress: string;
  pairingCode: string;
  connectAddress: string;
};

const ADDRESS_PATTERN = /^[\w.:[\]-]+:\d{2,5}$/;

function validateAddress(value: string | undefined, required: boolean): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return required ? "Enter the IP address and port" : undefined;
  return ADDRESS_PATTERN.test(trimmed) ? undefined : "Use the format 192.168.1.20:37000";
}

export function PairAndroidDeviceForm(props: { onPaired?: () => void }) {
  const navigation = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: { pairingAddress: "", pairingCode: "", connectAddress: "" },
    validation: {
      pairingAddress: (value) => validateAddress(value, true),
      pairingCode: (value) => (value?.trim() ? undefined : "Enter the Wi-Fi pairing code"),
      connectAddress: (value) => validateAddress(value, false),
    },
    onSubmit: async (values) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Pairing…" });
      try {
        await pairWithCode(
          {
            pairingAddress: values.pairingAddress.trim(),
            pairingCode: values.pairingCode.trim(),
            connectAddress: values.connectAddress.trim() || undefined,
          },
          () => {
            toast.title = "Paired. Connecting…";
          },
        );
        toast.style = Toast.Style.Success;
        toast.title = "Connected Android Device";
        // Opened from Manage Devices: go back to the list, where the device now shows.
        if (props.onPaired) {
          props.onPaired();
          navigation.pop();
        }
      } catch (error) {
        toast.hide();
        await showFailureToast(error, { title: "Couldn't Pair Device" });
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Pair Device" icon={Icon.Wifi} onSubmit={handleSubmit} />
          <Action.Push
            title="Pair with QR Code"
            icon={Icon.Camera}
            target={<PairWithQrCode onPaired={props.onPaired} />}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="On your Android device, open Settings → Developer options → Wireless debugging, then choose Pair device with pairing code. Your Mac and the device must be on the same Wi-Fi network." />
      <Form.TextField
        {...itemProps.pairingAddress}
        title="IP Address & Port"
        placeholder="192.168.1.20:37000"
        info="Shown under the pairing code on the device."
      />
      <Form.TextField {...itemProps.pairingCode} title="Wi-Fi Pairing Code" placeholder="123456" />
      <Form.TextField
        {...itemProps.connectAddress}
        title="Connect Address"
        placeholder="Optional, e.g. 192.168.1.20:41000"
        info="The address on the Wireless debugging screen. Leave empty to find it automatically."
      />
    </Form>
  );
}

type QrState =
  | { status: "starting" }
  | { status: "waiting"; image: string }
  | { status: "pairing"; image: string }
  | { status: "paired" }
  | { status: "failed"; message: string };

function PairWithQrCode(props: { onPaired?: () => void }) {
  const [state, setState] = useState<QrState>({ status: "starting" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let image: string | undefined;
    setState({ status: "starting" });

    pairWithQrCode({
      signal: controller.signal,
      onQrCode: async (payload) => {
        image = await QRCode.toDataURL(payload, { width: 190, margin: 1 });
        if (!controller.signal.aborted) setState({ status: "waiting", image });
      },
      onScanned: () => {
        if (image && !controller.signal.aborted) setState({ status: "pairing", image });
      },
    })
      .then(() => {
        if (controller.signal.aborted) return;
        setState({ status: "paired" });
        props.onPaired?.();
        void showToast({ style: Toast.Style.Success, title: "Connected Android Device" });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "failed", message: error instanceof Error ? error.message : String(error) });
      });

    // Leaving the view stops the CLI that waits for the scan.
    return () => controller.abort();
  }, [attempt]);

  let markdown: string;
  switch (state.status) {
    case "starting":
      markdown = "Creating a pairing code…";
      break;
    case "waiting":
      markdown = [
        "## Scan to Pair",
        "On your Android device, open **Developer options → Wireless debugging → Pair device with QR code** and scan this code. Both devices need to be on the same Wi-Fi network.",
        // An empty paragraph keeps the code from sitting right under the text.
        "&nbsp;",
        `![Pairing QR code](${state.image})`,
      ].join("\n\n");
      break;
    case "pairing":
      markdown = ["## Pairing…", "&nbsp;", `![Pairing QR code](${state.image})`].join("\n\n");
      break;
    case "paired":
      markdown = "## Connected\n\nThe device now shows in Manage Devices.";
      break;
    case "failed":
      markdown = `## Couldn't Pair Device\n\n${state.message}`;
      break;
  }

  return (
    <Detail
      isLoading={state.status === "starting" || state.status === "pairing"}
      markdown={markdown}
      actions={
        <ActionPanel>
          {state.status === "failed" || state.status === "paired" ? (
            <Action title="Show New QR Code" icon={Icon.ArrowClockwise} onAction={() => setAttempt(attempt + 1)} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
