import { Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { refreshCache } from "./api";

export default function RefreshCache() {
  const { data } = usePromise(refreshCache, []);

  return <Detail markdown={data} />;
}
