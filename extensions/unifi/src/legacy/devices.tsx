import { SelectSite } from "./components/site/list";
import { SiteDevicesList } from "./components/device/list";

export default function Command() {
  return <SelectSite onSiteSelectAction={(site) => <SiteDevicesList site={site} />} />;
}
