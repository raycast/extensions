import { createContext, type PropsWithChildren, useCallback, useContext, useMemo } from "react";
import { useConfigProvider } from "./ConfigProvider";
import fetch from "node-fetch";
import { PcloudBreadcrumb } from "../types/file";

type ApiContextValue = {
  baseUrl: string;
  withToken: (url: string) => string;
  getFilePath: (folderId: number, fileName: string) => Promise<string>;
};
const ApiContext = createContext<ApiContextValue>(undefined as unknown as ApiContextValue);

export const useApiProvider = () => {
  const context = useContext<ApiContextValue>(ApiContext);
  if (!context) throw new Error("useApiProvider must be used within a ApiProvider");
  return context;
};

type ApiProviderProps = PropsWithChildren<object>;

export function ApiProvider(props: ApiProviderProps) {
  const { children } = props;
  const { config } = useConfigProvider();

  const baseUrl = useMemo(() => `https://${config.isEuropeRegion ? "e" : ""}api.pcloud.com`, [config]);
  const withToken = useCallback((url: string) => `${url}&access_token=${config.token}`, [config]);
  const getFilePath = useCallback(
    async (folderId: number, fileName: string) =>
      await fetch(withToken(`${baseUrl}/getbreadcrumb?folderid=${folderId}`))
        .then((res) => res.json())
        .then(
          (res) =>
            (config?.pCloudDriveDirectory || "") +
            (res as PcloudBreadcrumb).breadcrumb
              .map((item: { metadata: { name: string } }) => item.metadata.name)
              .join("/")
              .replace(/\//, "") +
            "/" +
            fileName
        ),
    [baseUrl, config]
  );
  return (
    <ApiContext.Provider
      value={{
        baseUrl,
        withToken,
        getFilePath,
      }}
    >
      {children}
    </ApiContext.Provider>
  );
}
