import { Color, Icon, Image } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import type { DeviceKind } from "../blip/client";
import type { DeviceRecipient, PersonRecipient, TransferView } from "../blip/model";

export function deviceIcon(kind: DeviceKind | undefined, online: boolean): Image.ImageLike {
  const tint = online ? Color.PrimaryText : Color.SecondaryText;
  switch (kind) {
    case "Phone":
      return { source: Icon.Mobile, tintColor: tint };
    case "Tablet":
      return { source: Icon.Devices, tintColor: tint };
    case "Laptop":
      return { source: Icon.Monitor, tintColor: tint };
    case "Desktop":
      return { source: Icon.Desktop, tintColor: tint };
    default:
      return { source: Icon.HardDrive, tintColor: tint };
  }
}

export function personIcon(person: PersonRecipient): Image.ImageLike {
  return getAvatarIcon(person.title, { gradient: true });
}

export function recipientIcon(recipient: DeviceRecipient | PersonRecipient): Image.ImageLike {
  return recipient.kind === "device" ? deviceIcon(recipient.device.kind, recipient.online) : personIcon(recipient);
}

export function presenceAccessory(online: boolean, lastSeen: string | undefined) {
  return online
    ? { tag: { value: "Online", color: Color.Green }, tooltip: "Reachable now" }
    : {
        text: lastSeen ? `Seen ${lastSeen}` : "Offline",
        icon: Icon.Circle,
        tooltip: "Blip will deliver when the device comes online",
      };
}

export function transferIcon(view: TransferView): Image.ImageLike {
  switch (view.status) {
    case "Completed":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "Cancelled":
      return view.error && view.error !== "Cancelled"
        ? { source: Icon.XMarkCircle, tintColor: Color.Red }
        : { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
    case "Paused":
      return { source: Icon.PauseFilled, tintColor: Color.Orange };
    case "Active":
      return { source: progressIconName(view.fraction), tintColor: Color.Blue };
    case "Invited":
    case "InviteRequested":
      return view.incoming
        ? { source: Icon.Bell, tintColor: Color.Blue }
        : { source: Icon.Hourglass, tintColor: Color.SecondaryText };
    default:
      return { source: view.incoming ? Icon.ArrowDownCircle : Icon.ArrowUpCircle, tintColor: Color.SecondaryText };
  }
}

function progressIconName(fraction: number): Icon {
  if (fraction >= 0.875) return Icon.CircleProgress100;
  if (fraction >= 0.625) return Icon.CircleProgress75;
  if (fraction >= 0.375) return Icon.CircleProgress50;
  if (fraction >= 0.125) return Icon.CircleProgress25;
  return Icon.CircleProgress;
}

export function statusColor(view: TransferView): Color {
  switch (view.status) {
    case "Completed":
      return Color.Green;
    case "Active":
    case "ResumeRequested":
      return Color.Blue;
    case "Paused":
      return Color.Orange;
    case "Cancelled":
      return view.error && view.error !== "Cancelled" ? Color.Red : Color.SecondaryText;
    case "Invited":
      return view.incoming ? Color.Blue : Color.SecondaryText;
    default:
      return Color.SecondaryText;
  }
}
