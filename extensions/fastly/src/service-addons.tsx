import { Icon } from "@raycast/api";
import { ServicePicker } from "./views/service-picker";
import { AddonList } from "./views/addon-list";

export default function Command() {
  return (
    <ServicePicker
      actionTitle="Manage Add-Ons"
      actionIcon={Icon.Plus}
      searchBarPlaceholder="Pick a service to manage its add-ons..."
      getTarget={(service) => <AddonList service={service} />}
    />
  );
}
