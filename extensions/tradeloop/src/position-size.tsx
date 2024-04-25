import { Clipboard, getPreferenceValues, Keyboard, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";

interface PositionSizeProps {
  arguments: {
    stop_loss: string;
    risk: string;
    order_type: "none" | "limit" | "market";
  };
}

export default async function PositionSize(props: LaunchProps<PositionSizeProps>) {
  const preferences = getPreferenceValues<Preferences.PositionSize>();

  const include_fees =
    preferences.subtract_fees || props.arguments.order_type === "limit" || props.arguments.order_type === "market";

  const order_type = props.arguments.order_type || preferences.default_order_type;

  const fee =
    include_fees && !(order_type === "none")
      ? order_type === "limit"
        ? Number(preferences.limit_fees)
        : Number(preferences.market_fees)
      : 0;

  const stop_loss = Number(props.arguments.stop_loss);
  const risk = Number(props.arguments.risk);

  const position_size_without_fee = risk / (stop_loss / 100);
  const position_size = position_size_without_fee - (position_size_without_fee * fee) / 100;

  await showToast({
    style: Toast.Style.Success,
    title: `$${position_size.toLocaleString()}`,
    primaryAction: {
      title: "Copy",
      shortcut: Keyboard.Shortcut.Common.Copy,
      onAction: async () => {
        await Clipboard.copy(position_size);
        await showHUD("Copied");
      },
    },
  });
}
