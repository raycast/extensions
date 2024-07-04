import { useEffect, useState } from "react";
import OtpListItem, { Otp } from "./OtpListItem";
import { clearTimeout } from "node:timers";

function calculateTimeLeft(basis: number) {
  return basis - (new Date().getSeconds() % basis);
}

interface TimeState {
  timeLeft10: number;
  timeLeft30: number;
}

interface OtpListItemsProps {
  items: Otp[];
  refresh: () => Promise<void>;
  setOtpList: (value: (prev: Otp[]) => Otp[]) => void;
}

export default function OtpListItems({ items, refresh, setOtpList }: OtpListItemsProps) {
  const [{ timeLeft10, timeLeft30 }, setTimes] = useState<TimeState>({
    timeLeft10: calculateTimeLeft(10),
    timeLeft30: calculateTimeLeft(30),
  });

  useEffect(() => {
    let id: NodeJS.Timeout;

    // rather use recursive setTimeout to get close to the start of the second
    const doSetTimes = () => {
      setTimes({
        timeLeft10: calculateTimeLeft(10),
        timeLeft30: calculateTimeLeft(30),
      });
      id = setTimeout(doSetTimes, 1000 - new Date().getMilliseconds());
    };
    doSetTimes();
    return () => clearTimeout(id);
  }, []);

  return (
    <>
      {items.map((item, index) => (
        <OtpListItem
          key={index}
          index={index}
          item={item}
          basis={item.type === "service" ? 30 : 10}
          timeLeft={item.type === "service" ? timeLeft30 : timeLeft10}
          refresh={refresh}
          setOtpList={setOtpList}
        />
      ))}
    </>
  );
}
