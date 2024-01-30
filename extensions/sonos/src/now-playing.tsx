import { MenuBarExtra } from "@raycast/api";
import { useSerializedState } from "./core/hooks";

export default function Command() {
  const { title, loading } = useSerializedState();

  return <MenuBarExtra isLoading={loading} title={title ?? ""} />;
}
