import { LocalStorage } from "@raycast/api";
import got from "got";
import { useEffect, useState } from "react";
import { Loading, MappedExpression, ZipCodeResponse } from "../types";
import { capitalizeSentence } from "../utilities";

const ZIP_CODES_BASE_URL = "https://i18napis.appspot.com/address/data/";
const ZIP_CODES_STORAGE_TOKEN = "ZIP_CODES";

type ZipCodesMap = {
  [key: string]: Record<string, string>;
};

export function useZipCodes(expressions: MappedExpression[]): { zipCodes: MappedExpression[]; loading: Loading } {
  const [loading, setLoading] = useState<Loading>(Loading.IDLE);
  const [zipCodes, setZipCodes] = useState<MappedExpression[]>([]);
  const zipAddressesRequests: Promise<any>[] = [];

  useEffect(() => {
    (async () => {
      const zipCodesFromStorage = JSON.parse((await LocalStorage.getItem(ZIP_CODES_STORAGE_TOKEN)) || "[]");

      if (zipCodesFromStorage.length > 0) {
        setZipCodes(zipCodesFromStorage);
        return;
      }

      expressions.forEach((expression: MappedExpression) =>
        zipAddressesRequests.push(got(`${ZIP_CODES_BASE_URL}${expression.name}`))
      );

      let zipCodesApiResponses;

      setLoading(Loading.LOADING);

      try {
        zipCodesApiResponses = await Promise.all(zipAddressesRequests);
      } catch (err) {
        setLoading(Loading.FAILED);
        return;
      }
      const mappedResponse: ZipCodesMap = zipCodesApiResponses.reduce((acc: ZipCodesMap, curr) => {
        let unserializedResponse;

        try {
          unserializedResponse = JSON.parse(curr.body) as ZipCodeResponse;
        } catch (err) {
          unserializedResponse = {} as ZipCodeResponse;
        }
        const country = capitalizeSentence(unserializedResponse.name || "");
        const zipCode = unserializedResponse.key;

        return {
          ...acc,
          [zipCode]: { country },
        };
      }, {});

      setZipCodes(
        expressions.map((expression: MappedExpression) => ({
          ...expression,
          description: mappedResponse[expression.name]?.country || "",
        })) as unknown as MappedExpression[]
      );
    })();
  }, []);

  useEffect(() => {
    if (!zipCodes) {
      return;
    }

    if (loading === Loading.LOADING) {
      setLoading(Loading.LOADED);
    }

    (async () => {
      await LocalStorage.setItem(ZIP_CODES_STORAGE_TOKEN, JSON.stringify(zipCodes));
    })();
  }, [zipCodes]);

  return {
    zipCodes,
    loading,
  };
}
