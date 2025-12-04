import { Icon } from "@raycast/api";
import { useCallback, useState } from "react";

export type Toggle = {
  show: boolean;
  toggle: () => void;
  title: string;
  icon: Icon;
};

export function useToggle(
  title: string,
  initial: boolean,
  icons?: {
    show: Icon;
    hide: Icon;
  },
): Toggle {
  const [show, setShow] = useState(initial);

  const toggle = useCallback(() => {
    setShow((show) => !show);
  }, []);

  return {
    show,
    toggle,
    title: `${show ? "Hide" : "Show"} ${title}`,
    icon: show ? (icons?.hide ?? Icon.EyeDisabled) : (icons?.show ?? Icon.Eye),
  };
}
