import { useState, useEffect } from "react";
import { LocalStorage } from "@raycast/api";

export function useDetailToggle(storageKey: string): [boolean, () => Promise<void>] {
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  useEffect(() => {
    LocalStorage.getItem<boolean>(storageKey).then((value) => {
      if (value !== undefined) {
        setIsShowingDetail(value);
      }
    });
  }, [storageKey]);

  const handleToggleDetail = async () => {
    const newValue = !isShowingDetail;
    setIsShowingDetail(newValue);
    await LocalStorage.setItem(storageKey, newValue);
  };

  return [isShowingDetail, handleToggleDetail];
}
