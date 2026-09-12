import { useProviders } from "./hooks/useProvider";
import { ProviderList } from "./views/provider-list";

export default function Command() {
  const providers = useProviders();
  return <ProviderList hook={providers} />;
}
