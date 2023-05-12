import { Clipboard, closeMainWindow, popToRoot, List } from "@raycast/api";
import { useEffect } from "react";
import { useMessages } from "./messages";
import { extractCode } from "./utils";

export default () => {
  const { isLoading, data, permissionView } = useMessages({ searchText: "", searchType: "code" });

  if (permissionView) {
    return permissionView;
  }

  useEffect(() => {
    if (data?.length) {
      const code = extractCode(data[0].text);
      if (code) {
        Clipboard.paste(code);
      }
    }
  }, [data]);

  useEffect(() => {
    if (!isLoading) {
      popToRoot().finally(() => {
        closeMainWindow();
      });
    }
  }, [isLoading]);

  return <List isLoading={isLoading}></List>;
};
