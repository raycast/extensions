import { useCallback, useState } from "react";
import { addRecentSvgIdToLocal, getRecentSvgIds } from "../utils/local-svg";

export const useRecentSvg = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [recentSvgIds, setRecentSvgIds] = useState<number[]>([]);

  const loadRecentSvg = useCallback(async () => {
    setIsLoading(true);
    const recentSvgIds = await getRecentSvgIds();
    setRecentSvgIds(recentSvgIds);
    setIsLoading(false);
  }, [setRecentSvgIds, setIsLoading]);

  const addRecentSvgId = (id: number) => {
    const newRecentSvgIds = recentSvgIds.filter((recentId: number) => recentId !== id);
    newRecentSvgIds.unshift(id);
    setRecentSvgIds(newRecentSvgIds);
    addRecentSvgIdToLocal(id);
  };

  return { isLoading, recentSvgIds, loadRecentSvg, addRecentSvgId };
};
