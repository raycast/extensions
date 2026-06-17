import { useCallback, useState } from "react";
import { getPinnedSvgIds, pinSvgToLocal, syncLocalPinnedSvgIds, unPinSvgFromLocal } from "../utils/local-svg";
import { Toast, showToast } from "@raycast/api";

export const usePinSvg = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [pinnedSvgIds, setPinnedSvgIds] = useState<number[]>([]);

  const loadPinnedSvg = useCallback(async () => {
    setIsLoading(true);
    const pinnedSvgIds = await getPinnedSvgIds();
    setPinnedSvgIds(pinnedSvgIds);
    setIsLoading(false);
  }, [setPinnedSvgIds, setIsLoading]);

  const pinSvg = async (id: number, name: string) => {
    if (pinnedSvgIds.includes(id)) {
      return;
    }
    setPinnedSvgIds((prev) => [id, ...prev]);
    pinSvgToLocal(id);
    await showToast({
      style: Toast.Style.Success,
      title: `Pinned ${name}`,
    });
  };

  const unPinSvg = async (id: number, name: string) => {
    if (!pinnedSvgIds.includes(id)) {
      return;
    }
    setPinnedSvgIds((prev) => prev.filter((pinnedId) => pinnedId !== id));
    unPinSvgFromLocal(id);
    await showToast({
      style: Toast.Style.Success,
      title: `Unpinned ${name}`,
    });
  };

  const moveUpInPinned = async (id: number, name: string) => {
    const index = pinnedSvgIds.indexOf(id);
    if (index === 0) {
      return;
    }
    const newPinnedSvgIds = [...pinnedSvgIds];
    newPinnedSvgIds.splice(index, 1);
    newPinnedSvgIds.splice(index - 1, 0, id);
    setPinnedSvgIds(newPinnedSvgIds);
    syncLocalPinnedSvgIds(newPinnedSvgIds);
    await showToast({
      style: Toast.Style.Success,
      title: `Moved up ${name}`,
    });
  };

  const moveDownInPinned = async (id: number, name: string) => {
    const index = pinnedSvgIds.indexOf(id);
    if (index === pinnedSvgIds.length - 1) {
      return;
    }
    const newPinnedSvgIds = [...pinnedSvgIds];
    newPinnedSvgIds.splice(index, 1);
    newPinnedSvgIds.splice(index + 1, 0, id);
    setPinnedSvgIds(newPinnedSvgIds);
    syncLocalPinnedSvgIds(newPinnedSvgIds);
    await showToast({
      style: Toast.Style.Success,
      title: `Moved down ${name}`,
    });
  };

  return { isLoading, pinnedSvgIds, loadPinnedSvg, pinSvg, unPinSvg, moveUpInPinned, moveDownInPinned };
};
