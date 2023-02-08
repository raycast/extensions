import { MenuBarExtra } from "@raycast/api";
import { fetchPrice } from "./api";

export default function Command() {
  const { data, isLoading } = fetchPrice("SOL");
  let price = data ? parseFloat(data.data.SOL.price).toFixed(2) : "loading";

  return (
    <MenuBarExtra
      icon={{
        source: "solana.svg",
        tintColor: {
          light: "black",
          dark: "white",
        },
      }}
      tooltip="gm"
      title={data ? `$${price}` : "loading"}
      isLoading={isLoading}
    ></MenuBarExtra>
  );
}
