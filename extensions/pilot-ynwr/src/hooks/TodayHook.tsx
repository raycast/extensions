import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

const TodayHook = () => {
  const [todayRefresh, setTodayRefresh] = useState<boolean>(false);

  const checkForToday = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const lastToday = await LocalStorage.getItem("today");
    if (lastToday !== today) {
      await LocalStorage.setItem("today", today);
      setTodayRefresh(true);
    }
  };

  useEffect(() => {
    checkForToday();
  });

  return { todayRefresh };
};

export default TodayHook;
