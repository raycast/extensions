import { List } from "@raycast/api";
import { SchedulingLink } from "@/utils/types";
import {
  SAVVYCAL_BASE_URL,
  greenIcon,
  redIcon,
  savvycalIcon,
} from "../utils/savvycal";
import LinkActions from "./LinkActions";

export default function Link(link: SchedulingLink) {
  return (
    <List.Item
      title={link.name}
      subtitle={SAVVYCAL_BASE_URL + "/" + link.scope.slug + "/" + link.slug}
      icon={savvycalIcon}
      accessories={[{ icon: link.state == "active" ? greenIcon : redIcon }]} //TODO: there's probably a way to make this reactive
      actions={<LinkActions {...link} />}
    />
  );
}
