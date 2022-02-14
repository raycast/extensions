import { useEffect, useState, Fragment } from "react";
import OtpListItem, { Otp } from "./OtpListItem";
import { compare } from "../util/compare";

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
}

export default function OtpListItems({ items, refresh }: OtpListItemsProps) {
  const [{ timeLeft10, timeLeft30 }, setTimes] = useState<TimeState>({
    timeLeft10: calculateTimeLeft(10),
    timeLeft30: calculateTimeLeft(30),
  });

  useEffect(() => {
    // use 250ms to get closer to the start of the second
    // and only update when we are close to the start of the second
    const id = setInterval(
      () =>
        new Date().getMilliseconds() < 250 &&
        setTimes({
          timeLeft10: calculateTimeLeft(10),
          timeLeft30: calculateTimeLeft(30),
        }),
      250
    );
    return () => clearInterval(id);
  }, []);

  return (
    <Fragment>
      {items
        .sort((a: Otp, b: Otp) => compare(a.name, b.name))
        .map((item, index) => (
          <OtpListItem
            key={index}
            item={item}
            basis={item.type === "service" ? 30 : 10}
            timeLeft={item.type === "service" ? timeLeft30 : timeLeft10}
            refresh={refresh}
          />
        ))}
    </Fragment>
  );
}
