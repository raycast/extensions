import { getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";

const TimezoneHook = () => {
  const [gmt, setGMT] = useState<number>(0);

  const getTM = async () => {
    const newGMT = getPreferenceValues<{ gmt: string }>().gmt;
    setGMT(parseInt(newGMT));
  };

  useEffect(() => {
    getTM();
  }, []);

  const tmDate = (date: Date) => {
    date.setTime(date.getTime() + gmt * 60 * 60 * 1000);
    return date;
  };

  const untmDate = (date: Date) => {
    date.setTime(date.getTime() - gmt * 60 * 60 * 1000);
    return date;
  };

  return { gmt, tmDate, untmDate };
};
export default TimezoneHook;
