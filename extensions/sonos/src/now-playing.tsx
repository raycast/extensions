import { MenuBarExtra } from "@raycast/api";
import { useCurrentState } from "./core/hooks";

export default function Command() {
  const { title, loading } = useCurrentState();

  return <MenuBarExtra isLoading={loading} title={title ?? ""} />;
}
