import { useEffect, useState } from "react";
import { clearTimeout } from "node:timers";
import { Service } from "../../util/service";
import OtpListItem from "./OtpListItem";
import { setItemsFunction } from "./otp-helpers";

function calculateTimeLeft(basis: number) {
  return basis - (new Date().getSeconds() % basis);
}

interface TimeState {
  timeLeft10: number;
  timeLeft30: number;
}

interface OtpListItemsProps {
  items: Service[];
  setItems: setItemsFunction;
}

export default function OtpListItems({ items, setItems }: OtpListItemsProps) {
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
          timeLeft={item.type === "service" ? timeLeft30 : timeLeft10}
          setItems={setItems}
        />
      ))}
    </>
  );
}
