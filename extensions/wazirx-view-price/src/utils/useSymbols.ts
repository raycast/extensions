import { showToast, Toast } from "@raycast/api";
import axios, { AxiosError, AxiosResponse } from "axios";
import { useEffect, useState } from "react";
import { BASE_URL, QUOTE_ASSET } from "./lib";

interface SymbolsInterface {}

export default function useSymbols() {
  const [isLoadingSymbols, setIsLoadingSymbols] = useState<boolean>(true);
  const [symbols, setSymbols] = useState<(string | null)[]>([]);

  useEffect(() => {
    fetchSymbols();
  }, []);

  const fetchSymbols = async () => {
    setIsLoadingSymbols(true);

    await axios
      .get(`${BASE_URL}/sapi/v1/exchangeInfo`)
      .then((res: AxiosResponse) => {
        if (res.status === 200) {
          let temp: (string | null)[] = [];

          res.data.symbols.map((ast: any) => {
            if (ast.quoteAsset === QUOTE_ASSET && ast.status === "trading") {
              temp.push(ast.baseAsset);
            }
          });

          setSymbols(temp);
        }
      })
      .catch((err: AxiosError) => {
        setTimeout(() => {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch symbols",
            message: err.message,
          });
        }, 500);
      })
      .finally(() => {
        setIsLoadingSymbols(false);
      });
  };

  return { symbols, isLoadingSymbols };
}
