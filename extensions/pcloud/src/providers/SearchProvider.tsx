import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from "react";
import { useDelayedState } from "../utils/hooks/useDelayedState";
import { IFile } from "../types/file";
import { parsePcloudResponse, PCloudPaginatedResponse } from "../utils/file";
import { useFetch } from "@raycast/utils";
import { useConfigProvider } from "./ConfigProvider";
import { useApiProvider } from "./ApiProvider";
import { isNotNullOrUndefined } from "../utils/utils";

type SearchContextValue = {
  search: (text: string) => void;
  clearSearch: () => void;
  searchText: string;
  isLoading: boolean;
  files: Array<IFile> | undefined;
  error: Error | undefined;
  pagination?:
    | {
        pageSize: number;
        hasMore: boolean;
        onLoadMore: () => void;
      }
    | undefined;
  totalItems: number;
};
const SearchContext = createContext<SearchContextValue>(undefined as unknown as SearchContextValue);

export const useSearchProvider = () => {
  const context = useContext<SearchContextValue>(SearchContext);
  if (!context) throw new Error("useSearchProvider must be used within a SearchProvider");
  return context;
};

type SearchProviderProps = PropsWithChildren<{
  ignore?: string[];
}>;

const pageSize = 100;

export function SearchProvider(props: SearchProviderProps) {
  const { children } = props;
  const [_searchText, _setSearchText] = useState<string>("");
  const debouncedSearchText = useDelayedState<string>(_searchText, 300);
  const [totalItems, setTotalItems] = useState<number>(0);
  const {
    config: { token },
  } = useConfigProvider();

  const { baseUrl, getFilePath } = useApiProvider();

  const urlParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append("query", debouncedSearchText);
    params.append("iconformat", "id");
    params.append("access_token", token);
    return params;
  }, [debouncedSearchText, token]);

  const getPaginationParams = useCallback((options: { page: number }) => {
    return new URLSearchParams({
      offset: "" + options.page * pageSize,
      limit: "" + pageSize,
    }).toString();
  }, []);

  const { data, isLoading, error, pagination } = useFetch<PCloudPaginatedResponse, unknown, Array<IFile>>(
    (options) => `${baseUrl}/search?${urlParams.toString()}&${getPaginationParams(options)}`,
    {
      parseResponse: async (d) =>
        parsePcloudResponse(d, {
          getFilePath,
        }),
      mapResult(result) {
        isNotNullOrUndefined(result.total) && setTotalItems(result.total);
        return {
          data: result.items,
          hasMore: result.items.length < (result?.total || 500),
        };
      },
      keepPreviousData: true,
      initialData: [],
    }
  );

  const search = (text: string) => {
    _setSearchText(text);
  };

  const clearSearch = () => {
    _setSearchText("");
  };

  return (
    <SearchContext.Provider
      value={{
        searchText: debouncedSearchText,
        search,
        files: data,
        clearSearch,
        isLoading,
        error,
        pagination,
        totalItems,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}
