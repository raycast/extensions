import { useEffect, useMemo, useState } from "react";
import { Icon, List, showToast, Toast } from "@raycast/api";
import { Loading, MappedExpression } from "../types";
import { ExpressionItemActions } from "../searchRegexp";
import { useZipCodes } from "../hooks/useZipcodes";

interface ZipCodesList {
  expressions: MappedExpression[];
}

export default function ZipCodesList({ expressions }: ZipCodesList): JSX.Element {
  const [search, setSearch] = useState<string>("");
  const { loading, zipCodes } = useZipCodes(expressions);

  useEffect(() => {
    (async () => {
      if (loading === Loading.IDLE) {
        return;
      }
      const toastOptions: [Toast.Style, string] | [] =
        loading === Loading.LOADING
          ? [Toast.Style.Animated, "Loading..."]
          : loading === Loading.LOADED
          ? [Toast.Style.Success, "Loaded."]
          : [];

      const [style, message] = toastOptions;

      toastOptions.length && (await showToast(style!, message!));
    })();
  }, [loading]);

  useEffect(() => {
    (async () => {
      if (loading === Loading.FAILED) {
        await showToast(Toast.Style.Failure, "Unable to receive zip codes data.");
      }
    })();
  }, [loading]);

  const filteredZipCodes = useMemo(() => {
    return zipCodes?.filter((zipCode) => {
      return (
        zipCode.description?.toLowerCase().includes(search.toLowerCase()) ||
        zipCode.name?.toLowerCase().includes(search.toLowerCase()) ||
        search.trim() === ""
      );
    });
  }, [zipCodes, search]);

  return (
    <List
      filtering={false}
      searchBarPlaceholder={"Search Zip codes"}
      navigationTitle="Search Zip codes"
      onSearchTextChange={setSearch}
    >
      {[Loading.LOADED, Loading.IDLE].includes(loading) && (filteredZipCodes ?? []).length > 0 ? (
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
