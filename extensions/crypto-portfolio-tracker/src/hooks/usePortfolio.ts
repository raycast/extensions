import { useCallback, useEffect, useState } from "react";
import { getPortfolio, StoredPortfolio } from "../util/portfolio";

export const usePortfolio = () => {
  const [portfolio, setPortfolio] = useState<StoredPortfolio>({ ethereum: {} });
  const [isLoading, setIsLoading] = useState(true);

  const getPortfolio_ = useCallback(async () => {
    setIsLoading(true);
    const storedPortfolio = await getPortfolio();
    setPortfolio(storedPortfolio);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    getPortfolio_();
  }, [getPortfolio_]);

  return { portfolio, isLoading, refresh: getPortfolio_ };
};
