import { Action, ActionPanel, List, Detail, Icon, showToast, Toast, openCommandPreferences } from "@raycast/api";
import { useState } from "react";
import costflow from "costflow";
import { NParseResult } from "costflow/lib/interface";
import fs from "fs-extra";
import { preferences } from "./utils/preferences";
import EmptyView from "./components/EmptyView";
import ErrorView from "./components/ErrorView";
import TransactionItem from "./components/TransactionItem";

const costFlowConfig = fs.readJsonSync(preferences.costflowConfigFilePath);

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [parseResult, setParseResult] = useState<{ json: NParseResult.TransactionResult; data: NParseResult.Result }>();

  const handleSearchTextChange = async (searchText: string) => {
    const trimedSearchText = String.prototype.trim.call(searchText);
    setSearchText(trimedSearchText);

    if (trimedSearchText === "") {
      setParseResult(undefined);
      return;
    }

    const toast = await showToast({ title: "Parsing...", style: Toast.Style.Animated });
    try {
      const jsonParseResult = await costflow.parse(searchText, costFlowConfig, { mode: "json" });
      const beancountParseResult = await costflow.parse(searchText, costFlowConfig, { mode: "beancount" });

      if ((jsonParseResult as NParseResult.Error).error) {
        throw new Error((jsonParseResult as NParseResult.Error).error);
      }

      toast.style = Toast.Style.Success;
      toast.title = "Costflow Parse Success";
      setParseResult({
        json: jsonParseResult as NParseResult.TransactionResult,
        data: beancountParseResult as NParseResult.Result,
      });
    } catch (err) {
      setParseResult(undefined);
      toast.style = Toast.Style.Failure;
      toast.title = "Costflow Parse Failed";
      if (err instanceof Error) {
        toast.message = err.message;
      }
    }
  };

  return (
    <List
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="@Spotify 15.98 USD visa > subscription"
      throttle={false}
      isShowingDetail={searchText !== "" && parseResult != null}
      actions={
        <ActionPanel title="Beancount Meta">
          {searchText !== "" && parseResult == null && (
            <Action.OpenInBrowser title="Open Costflow Syntax Doc" url="https://www.costflow.io/docs/syntax/" />
          )}
          <Action.Push
            title="Show Costflow Config"
            icon={Icon.Code}
            target={
              <Detail
                navigationTitle="Costflow Config"
                markdown={"```json\n" + JSON.stringify(costFlowConfig, null, 2) + "\n```"}
              />
            }
          />
          <Action title="Open Perferences" icon={Icon.Cog} onAction={openCommandPreferences} />
        </ActionPanel>
      }
    >
      {searchText === "" && parseResult == null && <EmptyView />}
      {searchText !== "" && parseResult == null && <ErrorView />}
      {searchText !== "" && parseResult != null && <TransactionItem parseResult={parseResult} />}
    </List>
  );
}
