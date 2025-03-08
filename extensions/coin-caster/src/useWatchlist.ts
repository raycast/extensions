import { LocalStorage } from "@raycast/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function useWatchlist() {
  const getWatchlist = async (): Promise<string[]> => {
    const rawWatchlist = await LocalStorage.getItem<string>("watchlist");
    return rawWatchlist ? JSON.parse(rawWatchlist) : [];
  };

  const queryClient = useQueryClient();

  const { data: watchlist, isLoading } = useQuery({
    queryKey: ["watchlist"],
    queryFn: getWatchlist,
  });

  const isInWatchlist = (symbol: string) => {
    return watchlist?.includes(symbol);
  };

  const refreshWatchlist = async () => {
    await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
  };

  const addToWatchlist = async (symbol: string) => {
    const watchlist = await getWatchlist();
    await LocalStorage.setItem("watchlist", JSON.stringify([...watchlist, symbol]));
    await refreshWatchlist();
  };

  const removeFromWatchlist = async (symbol: string) => {
    const watchlist = await getWatchlist();
    await LocalStorage.setItem("watchlist", JSON.stringify(watchlist.filter((s: string) => s !== symbol)));
    await refreshWatchlist();
  };

  return { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, isLoading };
}
