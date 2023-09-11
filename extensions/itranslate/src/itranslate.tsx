import {
  List,
  getPreferenceValues,
  getSelectedText,
  ActionPanel,
  Action,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { TransAPIErrCode } from "./common/const";
import {
  checkPreferences,
  fetchTransAPIs,
  getLang,
  getServiceProviderMap,
  saveHistory,
  translateWithRefineLang,
} from "./common/itranslate.shared";
import { TranslateError, TranslateNotSupport } from "./components/TranslateError";
import { TranslateHistory } from "./components/TranslateHistory";
import { TranslateResult } from "./components/TranslateResult";
import { environment } from "@raycast/api";

let delayFetchTranslateAPITimer: NodeJS.Timeout;

export default function Command() {
  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  const langSecond: ILangItem = getLang(preferences.langSecond);
  const check = checkPreferences();
  if (check) return check;

  const [inputState, updateInputState] = useState<string>("");
  const [inputTempState, updateInputTempState] = useState<string>("");
  const [isLoadingState, updateLoadingState] = useState<boolean>(false);
  const [isShowDetail, updateShowDetail] = useState<boolean>(false);
  const [transResultsState, updateTransResultsState] = useState<ITranslateRes[]>([]);
  const [currentTargetLang, updateCurrentTargetLang] = useState<ILangItem>(getLang(preferences.langFirst));

  useEffect(() => {
    if (!preferences.selectedDefault) {
      return;
    }
    transSelected();
  }, []);

  useEffect(() => {
    if (inputTempState.trim().length > 0) {
      translate(currentTargetLang);
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
          onInputChange(text, true);
        }
      })
      .catch((e) => e);
  }

  function onInputChange(queryText: string, immediately?: boolean) {
    updateLoadingState(false);
    updateInputState(queryText);
    clearTimeout(delayFetchTranslateAPITimer);
    if (immediately) {
      updateInputTempState(queryText);
      return;
    }
    delayFetchTranslateAPITimer = setTimeout(() => {
      updateInputTempState(queryText);
    }, preferences.delayTransInterval || 800);
  }

  function parseSearchPre(): string {
    return inputTempState.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/([_])/g, " ");
  }

  function translate(targetLang: ILangItem) {
    if (!inputTempState) return;
    const contentToTrans = parseSearchPre();
    updateLoadingState(true);

    const transPromises: Promise<ITranslateRes>[] = fetchTransAPIs(contentToTrans, targetLang);
    const promises: Promise<ITranslateRes>[] = [];
    for (let index = 0; index < transPromises.length; index++) {
      promises.push(translateWithRefineLang(transPromises[index], contentToTrans, langSecond));
    }
    const transResultsInit: ITranslateRes[] = [];
    for (const provider of getServiceProviderMap().keys()) {
      transResultsInit.push({
        serviceProvider: provider,
        code: TransAPIErrCode.Loading,
        from: getLang(""),
        to: targetLang,
        res: "",
        origin: contentToTrans,
      });
    }
    updateTransResultsState(transResultsInit);
    updateShowDetail(true);
    promises.forEach(async (promise) => {
      const transResult = await promise;
      updateCurrentTargetLang(transResult.to);
      updateTransResultsState((origins) => {
        let hasLoading = false;
        const transResultsNew = origins.map((origin) => {
          let toPush: ITranslateRes;
          if (origin.serviceProvider === transResult.serviceProvider) {
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
          if (preferences.enableHistory && transResultsNew.length) {
            const history: ITransHistory = {
              time: new Date().getTime(),
              from: transResultsNew[0].from.langId,
              to: transResultsNew[0].to.langId,
              text: inputTempState,
              transList: transResultsNew.map((tran) => {
                return {
                  serviceProvider: tran.serviceProvider,
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
            onAction={openExtensionPreferences}
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
          onAction={openExtensionPreferences}
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
      <List.EmptyView title="Type something to translate..." icon={{ source: `no-view@${environment.theme}.png` }} />
      {transResultsState.map((transRes) => {
        if (transRes.code === TransAPIErrCode.Fail || transRes.code === TransAPIErrCode.Retry) {
          return <TranslateError key={transRes.serviceProvider} transRes={transRes} />;
        } else if (transRes.code === TransAPIErrCode.NotSupport) {
          return <TranslateNotSupport key={transRes.serviceProvider} transRes={transRes} />;
        } else {
          return <TranslateResult key={transRes.serviceProvider} transRes={transRes} onLangUpdate={translate} />;
        }
      })}
    </List>
  );
}
