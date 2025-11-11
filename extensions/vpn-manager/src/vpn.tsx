import { usePromise } from "@raycast/utils";
import { VPNList } from "./components/list";
import { VPNDataList } from "./scutil";

export default function Main(): JSX.Element {
  const engine = new VPNDataList();

  const { isLoading, data, revalidate } = usePromise(() => engine.refresh());
  const vpns = data ? data.getVPNs() : [];

  return <VPNList onAction={() => revalidate()} isLoading={isLoading} vpns={vpns} />;
}
