import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function useWatchlist() {
  const getWatchlist = async (): Promise<string[]> => {
    try {
      const rawWatchlist = await LocalStorage.getItem<string>("watchlist");
      return rawWatchlist ? JSON.parse(rawWatchlist) : [];
    } catch (error) {
      showFailureToast("Failed to fetch watchlist");
      return [];
    }
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
    try {
      await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    } catch (error) {
      showFailureToast("Failed to refresh watchlist");
    }
  };

  const addToWatchlist = async (symbol: string) => {
    try {
      const watchlist = await getWatchlist();
      if (watchlist.includes(symbol)) return;
      await LocalStorage.setItem("watchlist", JSON.stringify([...watchlist, symbol]));
      await refreshWatchlist();
    } catch (error) {
      showFailureToast("Failed to add to watchlist");
    }
  };

  const removeFromWatchlist = async (symbol: string) => {
    try {
      const watchlist = await getWatchlist();
      if (!watchlist.includes(symbol)) return;
      await LocalStorage.setItem("watchlist", JSON.stringify(watchlist.filter((s: string) => s !== symbol)));
      await refreshWatchlist();
    } catch (error) {
      showFailureToast("Failed to remove from watchlist");
    }
  };

  return { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, isLoading };
}
