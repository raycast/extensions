import { Action, Icon, LocalStorage } from "@raycast/api";
import React from "react";
import { MutatePromise } from "@raycast/utils";
import { Layout } from "../types/types";
import { layout } from "../types/preferences";

export function ActionOnDetail(props: {
  showDetail: boolean;
  showDetailMutate: MutatePromise<boolean | undefined, boolean | undefined> | undefined;
}) {
  const { showDetail, showDetailMutate } = props;
  return (
    typeof showDetailMutate !== "undefined" &&
    layout === Layout.LIST && (
      <Action
        title={"Toggle Details"}
        icon={Icon.Sidebar}
        shortcut={{ modifiers: ["shift", "ctrl"], key: "d" }}
        onAction={async () => {
          await LocalStorage.setItem("isShowDetail", !showDetail);
          await showDetailMutate();
        }}
      />
    )
  );
}
