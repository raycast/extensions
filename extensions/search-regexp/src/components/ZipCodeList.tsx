import { useEffect, useReducer, useMemo } from "react";
import got from "got";
import { Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { Loading, MappedExpression, ZipCodeResponse } from "../types";
import { ExpressionItemActions } from "../searchRegexp";
import { capitalizeSentence } from "../utilities";
import { ActionType, zipCodesListReducer, ZipCodesListState } from "../store/zipCodesReducer";

const ZIP_CODES_BASE_URL = "https://i18napis.appspot.com/address/data/";
const ZIP_CODES_STORAGE_TOKEN = "ZIP_CODES";

type ZipCodesMap = {
  [key: string]: Record<string, string>;
};

interface ZipCodesList {
  expressions: MappedExpression[];
}

const initialState: ZipCodesListState = {
  loading: Loading.IDLE,
  zipCodes: null,
  search: "",
  loadingFailed: false,
};

export default function ZipCodesList({ expressions }: ZipCodesList): JSX.Element {
  const [state, dispatch] = useReducer(zipCodesListReducer, initialState);
  const zipAddressesRequests: Promise<any>[] = [];

  useEffect(() => {
    (async () => {
      const zipCodesFromStorage = JSON.parse((await LocalStorage.getItem(ZIP_CODES_STORAGE_TOKEN)) || "[]");

      if (zipCodesFromStorage.length > 0) {
        dispatch({ type: ActionType.SetZipCodes, payload: zipCodesFromStorage });
        return;
      }

      expressions.forEach((expression: MappedExpression) =>
        zipAddressesRequests.push(got(`${ZIP_CODES_BASE_URL}${expression.name}`))
      );

      let zipCodesApiResponses;

      dispatch({ type: ActionType.StartCountriesLoading });

      try {
        zipCodesApiResponses = await Promise.all(zipAddressesRequests);
      } catch (err) {
        dispatch({ type: ActionType.LoadingFailed });
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

      dispatch({
        type: ActionType.SetZipCodes,
        payload: expressions.map((expression) => ({
          ...expression,
          description: mappedResponse[expression.name]?.country || "",
        })) as unknown as MappedExpression[],
      });
    })();
  }, []);

  useEffect(() => {
    if (!state.zipCodes) {
      return;
    }

    if (state.loading === Loading.LOADING) {
      dispatch({ type: ActionType.Loaded });
    }

    (async () => {
      await LocalStorage.setItem(ZIP_CODES_STORAGE_TOKEN, JSON.stringify(state.zipCodes));
    })();
  }, [state.zipCodes]);

  useEffect(() => {
    const { loading } = state;

    (async () => {
      if (loading === Loading.IDLE) {
        return;
      }
      const toastOptions: [Toast.Style, string] | [] =
        loading === Loading.LOADING
          ? [Toast.Style.Animated, "Loading..."]
          : !state.loadingFailed && loading === Loading.LOADED
            ? [Toast.Style.Success, "Loaded."]
            : [];

      const [style, message] = toastOptions;

      toastOptions.length && (await showToast(style!, message!));
    })();
  }, [state.loading]);

  useEffect(() => {
    (async () => {
      if (state.loadingFailed) {
        await showToast(Toast.Style.Failure, "Unable to receive zip codes data.");
      }
    })();
  }, [state.loadingFailed]);

  const filteredZipCodes = useMemo(() => {
    return state.zipCodes?.filter((zipCode) => {
      return (
        zipCode.description?.toLowerCase().includes(state.search.toLowerCase()) ||
        zipCode.name?.toLowerCase().includes(state.search.toLowerCase()) ||
        state.search.trim() === ""
      );
    });
  }, [state.zipCodes, state.search]);

  return (
    <List
      filtering={false}
      searchBarPlaceholder={"Search Zip codes"}
      navigationTitle="Search Zip codes"
      onSearchTextChange={(value: string) => dispatch({ type: ActionType.Search, payload: value })}
    >
      {[Loading.LOADED, Loading.IDLE].includes(state.loading) && (filteredZipCodes ?? []).length > 0 ? (
        filteredZipCodes?.map((item: MappedExpression) => {
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
