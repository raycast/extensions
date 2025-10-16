import { useEffect, useState } from "react";
import { getListFromFile, refreshExistingCache, CRYPTO_LIST_PATH } from "./index";
import { showToast, Toast } from "@raycast/api";
import { CryptoCurrency } from "../types";
import dayjs from "dayjs";
import fs from "fs";

export default function useCryptoList() {
  const [cryptoList, setCryptoList] = useState<CryptoCurrency[]>([]);

  useEffect(() => {
    getListFromFile((err, data) => {
      if (err) {
        console.error("ReadListError:" + err);
        return;
      }

      if (!data) {
        // fetch crypto list mapping if there's no data exist in the local file
        // the api has an limit num per request.
        refreshExistingCache((err, cryptoList) => {
          if (err) {
            console.error("WriteFileError:" + err);
            showToast(Toast.Style.Failure, "Refresh failed", (err as Error)?.message);
            return;
          }

          setCryptoList(cryptoList);
        });
      } else {
        const now = dayjs();
        const { cryptoList: cryptoListFromFile, timestamp } = JSON.parse(data);
        const fileCachedTimeDiff = now.diff(dayjs(timestamp), "day");

        //Remove cache file if it has been more than 15 days since last time saved.
        if (fileCachedTimeDiff >= 15) {
          fs.unlink(CRYPTO_LIST_PATH, (err) => {
            if (err) throw err;
            console.log("Crypto list cache has been cleared.");
          });
        }

        if (cryptoListFromFile) {
          setCryptoList(cryptoListFromFile);
        }
      }
    });
  }, []);

  return { cryptoList };
}
