import { useEffect, useState } from "react";

export function useCumulativeCost(cost: number) {
  const [cumulativeCost, setCumulativeCost] = useState(0);

  useEffect(() => {
    if (cost > 0) {
      setCumulativeCost((prev) => prev + cost);
    }
  }, [cost]);

  return cumulativeCost;
}
