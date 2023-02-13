import { Icon } from "@raycast/api";
import type { StatusState } from "../types/fieldTemplate";
import type { Option } from "../types/fieldTemplate";

export function getIconByStatusState(statusId: string | undefined, statuses: Option[]) {
  const status: StatusState = statuses?.find((item) => item.id === statusId)?.statusState ?? "default";

  switch (status) {
    case "default":
      return Icon.Circle;
    case "blocked":
      return Icon.MinusCircle;
    case "started":
      return Icon.CircleProgress50;
    case "canceled":
      return Icon.XMarkCircle;
    case "completed":
      return Icon.CheckCircle;
    default:
      return Icon.Window;
  }
}
