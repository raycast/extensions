import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  LaunchType,
  List,
  Toast,
  launchCommand,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { identify } from "../lib/nanoleaf-client";
import { getPairingErrorMessage } from "../utils";

type PairingStatus = { kind: "idle" } | { kind: "pairing" } | { kind: "success" } | { kind: "failed"; message: string };

interface Props {
  deviceAddress: string;
  pairDevice: () => Promise<void>;
  onChangeAddress: () => void;
}

function statusView(status: PairingStatus): { title: string; description: string; icon: Image.ImageLike } {
  switch (status.kind) {
    case "idle":
      return {
        title: "Ready to pair",
        description:
          "Place your device in pairing mode by pressing and holding the power button until the LED starts flashing, then hit Pair Device.",
        icon: Icon.Clock,
      };
    case "pairing":
      return {
        title: "Pairing…",
        description: "Talking to your device.",
        icon: Icon.Signal3,
      };
    case "success":
      return {
        title: "Device successfully paired!",
        description: "You can now control your lights.",
        icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      };
    case "failed":
      return {
        title: "Pairing failed",
        description: status.message,
        icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
      };
  }
}

export function PairDeviceScreen({ deviceAddress, pairDevice, onChangeAddress }: Props) {
  const [status, setStatus] = useState<PairingStatus>({ kind: "idle" });

  async function handlePair() {
    setStatus({ kind: "pairing" });
    const toast = await showToast({ title: "Pairing…", style: Toast.Style.Animated });
    try {
      await pairDevice();
      toast.title = "Device successfully paired!";
      toast.style = Toast.Style.Success;
      setStatus({ kind: "success" });
    } catch (error) {
      const message = getPairingErrorMessage(error);
      await toast.hide();
      await showFailureToast(error, { title: "Pairing failed" });
      setStatus({ kind: "failed", message });
    }
  }

  async function openControlLights() {
    await launchCommand({ name: "control-lights", type: LaunchType.UserInitiated });
  }

  async function handleIdentify() {
    try {
      await identify();
      await showToast({ title: "Identifying device", style: Toast.Style.Success });
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't identify device" });
    }
  }

  const view = statusView(status);
  const isPairing = status.kind === "pairing";

  return (
    <List isLoading={isPairing} navigationTitle={`Pair · ${deviceAddress}`}>
      <List.EmptyView
        title={view.title}
        description={view.description}
        icon={view.icon}
        actions={
          <ActionPanel>
            {status.kind === "success" ? (
              <>
                <Action title="Open Control Lights" icon={Icon.LightBulb} onAction={openControlLights} />
                <Action title="Identify Device" icon={Icon.Eye} onAction={handleIdentify} />
              </>
            ) : (
              !isPairing && <Action title="Pair Device" icon={Icon.Plug} onAction={handlePair} />
            )}
            <Action
              title="Change Device Address"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              onAction={onChangeAddress}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
