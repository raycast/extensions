import { SWRConfig } from "swr";
import { cacheProvider } from "./cache";
import Holidays from "./holidays";

export default function Command() {
  return (
    <SWRConfig value={{ provider: cacheProvider }}>
      <Holidays />
    </SWRConfig>
  );
}
