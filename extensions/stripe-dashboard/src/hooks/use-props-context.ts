import { useContext } from "react";
import { PropsContext } from "../contexts";
import { PageProps } from "../types";

export const usePropsContext = (): PageProps => {
  const context = useContext(PropsContext);

  if (context === undefined) {
    throw new Error("usePropsContext was used outside of its Provider");
  }

  return context;
};
