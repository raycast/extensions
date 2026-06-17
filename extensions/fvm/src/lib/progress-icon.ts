import { Icon } from "@raycast/api";
import { useEffect, useState } from "react";

export function useProgressIcon() {
  const icons = [Icon.CircleProgress25, Icon.CircleProgress50, Icon.CircleProgress75, Icon.CircleProgress100];
  const [currentIcon, setCurrentIcon] = useState(icons[0]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % icons.length;
        setCurrentIcon(icons[nextIndex]);
        return nextIndex;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return currentIcon;
}
