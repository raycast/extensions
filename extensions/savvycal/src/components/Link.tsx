import { List } from "@raycast/api";
import { SchedulingLink } from "@/utils/types";
import {
  SAVVYCAL_BASE_URL,
  greenIcon,
  clockIcon,
  redIcon,
  savvycalIcon,
} from "../utils/savvycal";
import LinkActions from "./LinkActions";

export default function Link(link: SchedulingLink) {
  const isActive = link.state == "active";
  const durations = link.durations.join(", ");

  return (
    <List.Item
      title={link.private_name ?? link.name}
      keywords={[link.slug]}
      subtitle={SAVVYCAL_BASE_URL + "/" + link.scope.slug + "/" + link.slug}
      icon={savvycalIcon}
      accessories={[
        {
          text: durations,
          icon: clockIcon,
          tooltip: "Available durations (In minutes)",
        },
        {
          tooltip: isActive ? "Enabled" : "Disabled",
          icon: isActive ? greenIcon : redIcon,
        },
      ]} //TODO: there's probably a way to make this reactive
      actions={<LinkActions {...link} />}
    />
  );
}
