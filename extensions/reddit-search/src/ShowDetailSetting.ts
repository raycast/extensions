import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

const key = "showDetail";

const useShowDetailSetting = () => {
  const [showDetailSetting, setShowDetailSetting] = useState<boolean>(true);

  const toggleShowDetailSetting = async () => {
    const newSetting = !((await LocalStorage.getItem<boolean>(key)) ?? true);
    await LocalStorage.setItem(key, newSetting);
    setShowDetailSetting(newSetting);
  };

  useEffect(() => {
    const getShowDetailSetting = async () => {
      const item = (await LocalStorage.getItem<boolean>(key)) ?? true;
      setShowDetailSetting(!!item);
    };

    getShowDetailSetting();
  }, []);

  return [showDetailSetting, toggleShowDetailSetting] as const;
};

export default useShowDetailSetting;
