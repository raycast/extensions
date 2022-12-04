import { useEffect, useState } from "react";
import got from "got";
import { Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { MappedExpression, ZipCodeResponse } from "../types";
import { ExpressionItemActions } from "../searchRegexp";
import { capitalizeSentence } from "../utilities";

const ZIP_CODES_BASE_URL = "https://i18napis.appspot.com/address/data/";
const ZIP_CODES_STORAGE_TOKEN = "ZIP_CODES";

type ZipCodesMap = {
  [key: string]: Record<string, string>;
};

enum Loading {
  IDLE,
  LOADING,
  LOADED,
}

export default function ZipCodesList({ expressions }: { expressions: MappedExpression[] }): JSX.Element {
  const [loading, setLoading] = useState<Loading>(Loading.IDLE);
  const [zipCodes, setZipcodes] = useState<MappedExpression[] | null>(null);
  const [filteredZipCodes, setFilteredZipCodes] = useState<MappedExpression[]>([]);
  const [search, setSearch] = useState<string>("");
  const [failed, setFailed] = useState<boolean>(false);
  const promises: Promise<any>[] = [];

  useEffect(() => {
    (async () => {
      const zipCodesFromStorage = JSON.parse((await LocalStorage.getItem(ZIP_CODES_STORAGE_TOKEN)) || "[]");

      if (zipCodesFromStorage.length > 0) {
        setZipcodes(zipCodesFromStorage);
        return;
      }

      expressions.forEach((expression: MappedExpression) =>
        promises.push(got(`${ZIP_CODES_BASE_URL}${expression.name}`))
      );

      let zipCodesApiResponses;

      setLoading(Loading.LOADING);

      try {
        zipCodesApiResponses = await Promise.all(promises);
      } catch (err) {
        setFailed(true);
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

      setZipcodes(
        expressions.map((expression) => ({
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
    setFilteredZipCodes(
      zipCodes.filter((zipCode) => {
        return (
          zipCode.description?.toLowerCase().includes(search.toLowerCase()) ||
          zipCode.name?.toLowerCase().includes(search.toLowerCase()) ||
          search.trim() === ""
        );
      })
    );
  }, [zipCodes, search]);

  useEffect(() => {
    if (!zipCodes) {
      return;
    }
    setLoading((loading: Loading) => (loading === Loading.LOADING ? Loading.LOADED : loading));

    (async () => {
      await LocalStorage.setItem(ZIP_CODES_STORAGE_TOKEN, JSON.stringify(zipCodes));
    })();
  }, [zipCodes]);

  useEffect(() => {
    (async () => {
      if (loading === Loading.IDLE) {
        return;
      }
      const toastOptions: [Toast.Style, string] | [] =
        loading === Loading.LOADING
          ? [Toast.Style.Animated, "Loading..."]
          : !failed && loading === Loading.LOADED
          ? [Toast.Style.Success, "Loaded."]
          : [];

      const [style, message] = toastOptions;

      toastOptions.length && (await showToast(style!, message!));
    })();
  }, [loading]);

  useEffect(() => {
    (async () => {
      if (failed) {
        await showToast(Toast.Style.Failure, "Unable to receive zip codes data.");
      }
    })();
  }, [failed]);

  return (
    <List
      filtering={false}
      searchBarPlaceholder={"Search Zip codes"}
      navigationTitle="Search Zip codes"
      onSearchTextChange={setSearch}
    >
      {(loading === Loading.LOADED || loading === Loading.IDLE) && filteredZipCodes.length > 0 ? (
        filteredZipCodes.map((item: MappedExpression) => {
          return (
            <List.Item
              key={item.id}
              title={item.name}
              icon={Icon.BarCode}
              subtitle={item.description}
              accessories={[{ text: `${item.displayName}` }]}
              actions={<ExpressionItemActions regexp={item.regexp!} />}
            />
          );
        })
      ) : (
        <List.EmptyView title={"Loading zip codes..."} />
      )}
    </List>
  );
}
