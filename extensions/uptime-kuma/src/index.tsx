import { AuthForm } from "./auth-form";
import { useCachedState } from "@raycast/utils";
import { ListMonitors } from "./list-monitors";

export default function Command() {
  const [kuma_url, setKumaUrl] = useCachedState<string>("kuma-url", "");

  async function handleSave(url: string) {
    setKumaUrl(url);
  }

  if (!kuma_url) {
    return <AuthForm onSave={handleSave} />;
  } else {
    return <ListMonitors />;
  }
}
