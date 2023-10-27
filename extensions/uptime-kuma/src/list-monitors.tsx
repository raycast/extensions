import { AuthForm } from "./auth-form";
import { useCachedState } from "@raycast/utils";
import { ListComponent } from "./list-component";

export default function Command() {
  const [kuma_url, setKumaUrl] = useCachedState<string>("kuma-url", "");

  async function handleSave(url: string) {
    setKumaUrl(url);
  }

  if (!kuma_url) {
    return <AuthForm onSave={handleSave} />;
  } else {
    return <ListComponent />;
  }
}
