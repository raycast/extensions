import {
  List,
  getPreferenceValues,
  getSelectedText,
  ActionPanel,
  Action,
  Icon,
  openCommandPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { TransAPIErrCode } from "./const";
import { checkService, fetchMultipleTransAPIs, getLang, getMultipleLangs, saveHistory } from "./itranslate.shared";
import { TranslateError, TranslateNotSupport } from "./TranslateError";
import { TranslateHistory } from "./TranslateHistory";
import { TranslateResult } from "./TranslateResult";

let delayFetchTranslateAPITimer: NodeJS.Timeout;

export default function Command() {
  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  const check = checkService(preferences.multipleServiceProvider, true);
  if (check) return check;

  const [inputState, updateInputState] = useState<string>("");
  const [inputTempState, updateInputTempState] = useState<string>("");
  const [isLoadingState, updateLoadingState] = useState<boolean>(false);
  const [isShowDetail, updateShowDetail] = useState<boolean>(false);
  const [transResultsState, updateTransResultsState] = useState<ITranslateRes[]>([]);
  const [multipleLangsState, updateMultipleLangsState] = useState<ILangItem[]>([]);

  useEffect(() => {
    updateMultipleLangsState(getMultipleLangs());
    if (!preferences.selectedDefault) {
      return;
    }
    transSelected();
  }, []);

  useEffect(() => {
    if (inputTempState.trim().length > 0) {
      translate();
    } else {
      updateTransResultsState([]);
      updateShowDetail(false);
    }
  }, [inputTempState]);

  function transSelected() {
    getSelectedText()
      .then((selectedText) => {
        const text = selectedText.trim();
        if (text.length > 0) {
          updateInputState(text);
          updateInputTempState(text);
        }
      })
      .catch((e) => e);
  }

  function onInputChange(queryText: string) {
    updateLoadingState(false);
    updateInputState(queryText);
    clearTimeout(delayFetchTranslateAPITimer);
    delayFetchTranslateAPITimer = setTimeout(() => {
      updateInputTempState(queryText);
    }, preferences.delayTransInterval || 800);
  }

  function parseSearchPre(): string {
    return inputTempState.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/([_])/g, " ");
  }

  function translate() {
    if (!inputTempState) return;
    const contentToTrans = parseSearchPre();
    updateLoadingState(true);
    const transPromises: Promise<ITranslateRes>[] = fetchMultipleTransAPIs(contentToTrans, multipleLangsState);
    const transResultsInit: ITranslateRes[] = [];
    for (const lang of multipleLangsState) {
      transResultsInit.push({
        serviceProvider: preferences.multipleServiceProvider,
        code: TransAPIErrCode.Loading,
        from: getLang(""),
        to: lang,
        res: "",
        start: new Date().getTime(),
        origin: contentToTrans,
      });
    }
    updateTransResultsState(transResultsInit);
    updateShowDetail(true);
    transPromises.forEach(async (promise) => {
      const transResult = await promise;
      transResult.end = new Date().getTime();
      updateTransResultsState((origins) => {
        let hasLoading = false;
        const transResultsNew = origins.map((origin) => {
          let toPush: ITranslateRes;
          if (origin.to === transResult.to) {
            transResult.start = origin.start;
            toPush = transResult;
          } else {
            toPush = origin;
          }
          if (toPush.code === TransAPIErrCode.Loading) {
            hasLoading = true;
          }
          return toPush;
        });
        if (!hasLoading) {
          updateLoadingState(false);
          if (preferences.enableHistory) {
            const history: ITransHistory = {
              time: new Date().getTime(),
              from: transResultsNew[0].from.langId,
              text: inputTempState,
              isMultiple: true,
              multipleServiceProvider: preferences.multipleServiceProvider,
              toList: transResultsNew.map((tran) => {
                return {
                  to: tran.to.langId,
                  res: tran.res,
                };
              }),
            };
            saveHistory(history, preferences.historyLimit);
          }
        }
        return transResultsNew;
      });
    });
  }

  function ListActions() {
    if (!preferences.selectedDefault) {
      return (
        <ActionPanel>
          <Action icon={Icon.Text} title="Translate Selected Content" onAction={transSelected} />
          {preferences.enableHistory && (
            <Action.Push
              icon={Icon.BulletPoints}
              title="Open Translation Histories"
              shortcut={{ modifiers: ["cmd"], key: "h" }}
              target={<TranslateHistory />}
            />
          )}
          <Action
            icon={Icon.ComputerChip}
            title="Open iTranslate Preferences"
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            onAction={openCommandPreferences}
          />
        </ActionPanel>
      );
    }
    return (
      <ActionPanel>
        {preferences.enableHistory && (
          <Action.Push
            icon={Icon.BulletPoints}
            title="Open Translation Histories"
            shortcut={{ modifiers: ["cmd"], key: "h" }}
            target={<TranslateHistory />}
          />
        )}
        <Action
          icon={Icon.ComputerChip}
          title="Open iTranslate Preferences"
          shortcut={{ modifiers: ["cmd"], key: "p" }}
          onAction={openCommandPreferences}
        />
      </ActionPanel>
    );
  }

  return (
    <List
      isLoading={isLoadingState}
      isShowingDetail={isShowDetail}
      searchText={inputState}
      searchBarPlaceholder={"Translate text"}
      onSearchTextChange={onInputChange}
      actions={ListActions()}
    >
      <List.EmptyView title="Type something to translate..." />
      {transResultsState.length > 0 &&
        transResultsState.map((trans) => {
          return (
            <List.Section key={trans.to.langId} title={`-> ${trans.to.langTitle}`}>
              {(trans.code === TransAPIErrCode.Fail || trans.code === TransAPIErrCode.Retry) && (
                <TranslateError transRes={trans} />
              )}
              {trans.code === TransAPIErrCode.NotSupport && <TranslateNotSupport transRes={trans} />}
              {trans.code === TransAPIErrCode.Success && <TranslateResult transRes={trans} />}
            </List.Section>
          );
        })}
    </List>
  );
}
