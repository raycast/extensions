import * as React from "react";
import type * as Types from "@ui/types";

interface TypeIsLoading {
  isLoading: boolean;
}
export const isLoading = React.createContext<TypeIsLoading>({
  isLoading: true,
});

interface TypeShowDetail {
  showDetail: boolean;
  setShowDetail?: React.Dispatch<React.SetStateAction<boolean>>;
}
export const showDetail = React.createContext<TypeShowDetail>({
  showDetail: false,
});

interface TypesGlpiServer {
  glpiServerConfig?: Types.GlpiServer[];
  revalidateGlpiServerConfig?: () => Promise<Types.GlpiServer[] | undefined>;
  selectedGlpiServer?: string;
  revalidateSelectedGlpiServer?: () => Promise<string | undefined>;
  revalidateData?: () => void;
}
export const glpiServer = React.createContext<TypesGlpiServer>({});
