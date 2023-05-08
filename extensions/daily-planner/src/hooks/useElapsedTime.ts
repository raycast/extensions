import { useEffect, useState } from "react";

const millisecondsSince = (startTimeValue: number) => Date.now() - startTimeValue;

export default function useElapsedTime(startTimeValue: number | undefined): number | undefined {
  const [timeValue, setTimeValue] = useState(startTimeValue ? millisecondsSince(startTimeValue) : undefined);

  useEffect(() => {
    if (startTimeValue) {
      let interval = setTimeout(() => {
        setTimeValue(millisecondsSince(startTimeValue));
        interval = setInterval(() => {
          setTimeValue(millisecondsSince(startTimeValue));
        }, 999);
      }, 1_000 - (millisecondsSince(startTimeValue) % 1_000));

      return () => clearInterval(interval);
    } else {
      // Remove the running timer accessory.
      setTimeValue(undefined);
    }
  }, [startTimeValue]);

  return timeValue;
}
