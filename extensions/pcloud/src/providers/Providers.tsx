import React from "react";
import ConfigProvider from "./ConfigProvider";
import { SearchProvider } from "./SearchProvider";
import { ApiProvider } from "./ApiProvider";

export default function Providers(props: { children: React.ReactNode }) {
  return (
    <ConfigProvider>
      <ApiProvider>
        <SearchProvider>{props.children}</SearchProvider>
      </ApiProvider>
    </ConfigProvider>
  );
}
