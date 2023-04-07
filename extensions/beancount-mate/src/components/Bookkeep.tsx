import { Action, ActionPanel, List, Detail, Icon, openCommandPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import fs from "fs-extra";
import costflow from "costflow";
import { NParseResult, UserConfig } from "costflow/lib/interface";
import EmptyView from "./EmptyView";
import ErrorView from "./ErrorView";
import SuccessView from "./SuccessView";
import TransactionItem from "./TransactionItem";
import { costflowConfigFilePath } from "../utils/preferences";
import { isJournalFileExists, parsedJournalFilePath } from "../utils/journalFile";

const parseSearchText = async (searchText: string, costflowConfig: UserConfig) => {
  const jsonParseResult = await costflow.parse(searchText, costflowConfig, { mode: "json" });
  const beancountParseResult = await costflow.parse(searchText, costflowConfig, { mode: "beancount" });

  if ((jsonParseResult as NParseResult.Error).error) {
    throw new Error((jsonParseResult as NParseResult.Error).error);
  }

  return {
    json: jsonParseResult as NParseResult.TransactionResult,
    data: beancountParseResult as NParseResult.Result,
  };
};

export default function Bookkeep() {
  const { isLoading: isCFLoading, data: costflowConfig } = usePromise(() => fs.readJson(costflowConfigFilePath));
  const { isLoading: isJFLoading, data: journalFileExists } = usePromise(isJournalFileExists);

  const [searchText, setSearchText] = useState("");
  const [parseResult, setParseResult] = useState<{ json: NParseResult.TransactionResult; data: NParseResult.Result }>();
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);

  const handleSearchTextChange = async (searchText: string) => {
    if (isSaveSuccess) {
      setIsSaveSuccess(false);
    }

    const trimedSearchText = String.prototype.trim.call(searchText);
    setSearchText(trimedSearchText);

    if (trimedSearchText === "") {
      setParseResult(undefined);
      return;
    }

    try {
      const parseResult = await parseSearchText(searchText, costflowConfig);
      setParseResult(parseResult);
    } catch (err) {
      setParseResult(undefined);
    }
  };

  const isPending = useMemo(() => searchText === "" && parseResult == null, [searchText, parseResult]);
  const isParseSuccess = useMemo(() => searchText !== "" && parseResult != null, [searchText, parseResult]);
  const isParseError = useMemo(() => searchText !== "" && parseResult == null, [searchText, parseResult]);

  return (
    <List
      isLoading={isCFLoading || isJFLoading}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="@Spotify 15.98 USD visa > subscription"
      throttle={false}
      isShowingDetail={isParseSuccess}
      actions={
        <ActionPanel title="Beancount Meta">
          {isSaveSuccess && <Action.Open title="Open Journal File" target={parsedJournalFilePath} />}
          {isParseError && (
            <Action.OpenInBrowser title="Open Costflow Syntax Doc" url="https://www.costflow.io/docs/syntax/" />
          )}
          <Action.Push
            title="Show Costflow Config"
            icon={Icon.Code}
            target={
              <Detail
                navigationTitle="Costflow Config"
                markdown={"```json\n" + JSON.stringify(costflowConfig, null, 2) + "\n```"}
              />
            }
          />
          <Action title="Open Perferences" icon={Icon.Cog} onAction={openCommandPreferences} />
        </ActionPanel>
      }
    >
      {isSaveSuccess ? (
        <SuccessView />
      ) : (
        <>
          {isPending && <EmptyView />}
          {isParseError && <ErrorView />}
          {isParseSuccess && parseResult != null && (
            <TransactionItem
              parseResult={parseResult}
              onSaveSuccess={() => {
                setSearchText("");
                setIsSaveSuccess(true);
              }}
              isJournalFileExists={journalFileExists}
            />
          )}
        </>
      )}
    </List>
  );
}
