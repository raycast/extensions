import * as React from "react";

interface TypeShowDetail {
  value: boolean;
  setValue?: React.Dispatch<React.SetStateAction<boolean>>;
}
export const ShowDetail = React.createContext<TypeShowDetail>({
  value: false,
});

interface TypeHandleRevalidateData {
  isLoading: boolean;
  revalidateData: () => Promise<void>;
}
export const HandleRevalidateData =
  React.createContext<TypeHandleRevalidateData>({
    isLoading: true,
    revalidateData: async () => {},
  });

interface TypeSelectedServer {
  value?: string;
  isLoading: boolean;
  setValue: (value: string) => Promise<void>;
}
export const SelectedServer = React.createContext<TypeSelectedServer>({
  isLoading: true,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setValue: async (value: string) => {},
});
