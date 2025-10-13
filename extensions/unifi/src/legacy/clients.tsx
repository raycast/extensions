import { SelectSite } from "./components/site/list";
import { SiteClientsList } from "./components/client/list";

export default function Command() {
  return <SelectSite onSiteSelectAction={(site) => <SiteClientsList site={site} />} />;
}
