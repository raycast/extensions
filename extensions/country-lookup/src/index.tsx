import { SWRConfig } from "swr";
import { cacheProvider } from "./cache";
import Countries from "./countries";

export default function Command() {
  return (
    <SWRConfig value={{ provider: cacheProvider }}>
      <Countries />
    </SWRConfig>
  );
}
