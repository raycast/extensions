import { useEffect, useState } from "react";
import { MenuBarExtra } from "@raycast/api";
import axios from "axios";

const fetchPrice = () => {
  const [state, setState] = useState<{ price: string; isLoading: boolean }>({
    price: "",
    isLoading: true,
  });
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("https://price.jup.ag/v3/price?ids=SOL");
        const data = res.data;
        const priceData = Math.round(data.data.SOL.price * 100) / 100;
        console.log(priceData);
        setState({
          price: `$${priceData}`,
          isLoading: false,
        });
      } catch (error) {
        console.log(error);
        setState({ price: "", isLoading: false });
      }
    })();
  }, []);
  return state;
};

export default function Command() {
  const { price, isLoading } = fetchPrice();

  return <MenuBarExtra icon={{ source: "solana.svg" }} tooltip="gm" title={price} isLoading={isLoading}></MenuBarExtra>;
}
