import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useApiKey } from "./hooks/useApiKey";
import { useRandomGifs, useSearchGifs } from "./hooks/useGifQueries";
import { ApiKeySetupForm } from "./components/ApiKeySetupForm";
import { GifGrid } from "./components/GifGrid";
import { LoadingGrid } from "./components/LoadingGrid";

const queryClient = new QueryClient();

function MemeCommand() {
  const [searchText, setSearchText] = useState("");
  const { apiKey, isLoadingApiKey, handleApiKeySaved } = useApiKey();

  const { data: randomGifs = [], refetch: refetchRandomGifs } = useRandomGifs(apiKey);
  const {
    data: searchData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isSearchLoading,
  } = useSearchGifs(searchText, apiKey);

  const allGifs = searchData?.pages.flatMap((page) => page.gifs) ?? [];

  if (isLoadingApiKey) {
    return <LoadingGrid />;
  }

  if (!apiKey) {
    return <ApiKeySetupForm onApiKeySaved={handleApiKeySaved} />;
  }

  return (
    <GifGrid
      randomGifs={randomGifs}
      allGifs={allGifs}
      searchText={searchText}
      isSearchLoading={isSearchLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onSearchTextChange={setSearchText}
      onFetchNextPage={fetchNextPage}
      onRefetchRandomGifs={refetchRandomGifs}
    />
  );
}

export default function Command() {
  return (
    <QueryClientProvider client={queryClient}>
      <MemeCommand />
    </QueryClientProvider>
  );
}
