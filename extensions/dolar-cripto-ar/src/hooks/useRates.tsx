import { useEffect, useState } from "react";
import { Dollar } from "../types/types";

const useRates = () => {
  const [state, setState] = useState<{ dollar: Dollar[]; crypto: Dollar[]; isLoading: boolean }>({
    dollar: [],
    crypto: [],
    isLoading: true,
  });

  useEffect(() => {
    setState({
      dollar: [{ name: "Blue" }, { name: "MEP" }, { name: "CCL" }],
      crypto: [{ name: "BTC" }, { name: "ETH" }],
      isLoading: false,
    });
  }, []);

  return state;
};

export default useRates;
