import {
  Form,
  ActionPanel,
  OpenInBrowserAction,
  popToRoot,
  allLocalStorageItems,
  setLocalStorageItem,
} from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  const [state, setState] = useState<State>(() => {
    return {
      status: "loading",
      query: "",
      searchType: "signature",
      useSameStrategy: false,
    };
  });

  useEffect(() => {
    async function loadPreferences() {
      const preferences = await allLocalStorageItems<Preferences>();

      setState({
        status: "loaded",
        query: "",
        searchType: preferences.useSameStrategy ? preferences.searchType : "signature",
        useSameStrategy: Boolean(preferences.useSameStrategy),
      });
    }

    loadPreferences();
  }, []);

  return (
    <Form
      isLoading={state.status === "loading"}
      actions={
        <ActionPanel>
          <OpenInBrowserAction
            title="Search"
            url={searchUrl(state)}
            onOpen={() => {
              setLocalStorageItem("useSameStrategy", state.useSameStrategy);
              if (state.useSameStrategy) {
                setLocalStorageItem("searchType", state.searchType);
              }

              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      {state.status === "loaded" && (
        <>
          <Form.TextField
            id="query"
            title={searchTypeTitle(state.searchType)}
            placeholder={searchTypePlaceholder(state.searchType)}
            value={state.query}
            onChange={(newQuery) => setState((prevState) => ({ ...prevState, query: newQuery }))}
          />
          <Form.Dropdown
            id="searchType"
            defaultValue="signature"
            title="Search by"
            value={state.searchType}
            onChange={(newSearchType: SearchType) =>
              setState((prevState) => ({ ...prevState, searchType: newSearchType as SearchType }))
            }
          >
            {searchTypes.map((searchType) => (
              <Form.Dropdown.Item key={searchType} title={searchTypeTitle(searchType)} value={searchType} />
            ))}
          </Form.Dropdown>
          <Form.Checkbox
            id="sameSearchStrategy"
            label="Use same search strategy next time"
            value={state.useSameStrategy}
            onChange={(newSetting) => setState((prevState) => ({ ...prevState, useSameStrategy: newSetting }))}
          />
        </>
      )}
    </Form>
  );
}

function searchUrl(state: State): string {
  const baseUrl = "https://klaftertief.github.io/elm-search";
  const prefix = () => {
    switch (state.searchType) {
      case "signature":
        return "";
      case "author":
        return "user:";
      case "moduleName":
        return "module:";
      case "packageName":
        return "package:";
    }
  };

  const queryParams = new URLSearchParams({ q: prefix() + state.query });

  return `${baseUrl}?${queryParams.toString()}`;
}

function searchTypeTitle(searchType: SearchType): string {
  switch (searchType) {
    case "signature":
      return "Type Signature";
    case "author":
      return "Author";
    case "packageName":
      return "Package Name";
    case "moduleName":
      return "Module Name";
  }
}

function searchTypePlaceholder(searchType: SearchType): string {
  switch (searchType) {
    case "signature":
      return "String -> Maybe Int";
    case "author":
      return "elm";
    case "packageName":
      return "core";
    case "moduleName":
      return "String";
  }
}

interface State {
  status: "loading" | "loaded";
  query: string;
  searchType: SearchType;
  useSameStrategy: boolean;
}

interface Preferences {
  searchType: SearchType;
  useSameStrategy: boolean;
}

type SearchType = "signature" | "author" | "packageName" | "moduleName";

const searchTypes: SearchType[] = ["signature", "author", "packageName", "moduleName"];
