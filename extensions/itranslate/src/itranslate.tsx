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
import {
  checkPreferences,
  fetchTransAPIs,
  getLang,
  getServiceProviderMap,
  translateWithRefineLang,
} from "./itranslate.shared";
import { TranslateError } from "./TranslateError";
import { TranslateResult } from "./TranslateResult";

export default function Command() {
  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  const langSecond: ILangItem = getLang(preferences.langSecond);
  const check = checkPreferences();
  if (check) return check;

  const [inputState, updateInputState] = useState<string>("");
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
    if (inputState.trim().length > 0) {
      translate(currentTargetLang);
    } else {
      updateTransResultsState([]);
      updateShowDetail(false);
    }
  }, [inputState]);

  function transSelected() {
    getSelectedText()
      .then((selectedText) => {
        const text = selectedText.trim();
        if (text.length > 0) {
          updateInputState(text);
        }
      })
      .catch((e) => e);
  }

  function onInputChange(queryText: string) {
    updateLoadingState(false);
    updateInputState(queryText);
  }

  function parseInputPre(): string {
    return inputState.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/([_])/g, " ");
  }

  function translate(targetLang: ILangItem) {
    if (!inputState) return;
    const contentToTrans = parseInputPre();
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
        start: new Date().getTime(),
        origin: contentToTrans,
      });
    }
    updateTransResultsState(transResultsInit);
    updateShowDetail(true);
    promises.forEach(async (promise) => {
      const transResult = await promise;
      transResult.end = new Date().getTime();
      updateCurrentTargetLang(transResult.to);
      updateTransResultsState((origins) => {
        let hasLoading = false;
        const transResultsNew = origins.map((origin) => {
          let toPush: ITranslateRes;
          if (origin.serviceProvider === transResult.serviceProvider) {
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
        }
        return transResultsNew;
      });
    });
  }

  function ListActions() {
    if (!preferences.selectedDefault) {
      return (
        <ActionPanel>
          <Action icon={Icon.Text} title="Translate selected content" onAction={transSelected} />
          <Action icon={Icon.ComputerChip} title="Open iTranslate Preferences" onAction={openCommandPreferences} />
        </ActionPanel>
      );
    }
    return (
      <ActionPanel>
        <Action icon={Icon.ComputerChip} title="Open iTranslate Preferences" onAction={openCommandPreferences} />
      </ActionPanel>
    );
  }

  return (
    <List
      isLoading={isLoadingState}
      throttle={true}
      isShowingDetail={isShowDetail}
      searchText={inputState}
      searchBarPlaceholder={"Translate text"}
      onSearchTextChange={onInputChange}
      actions={ListActions()}
    >
      <List.EmptyView title="Type something to translate..." />
      {transResultsState.length > 0 && (
        <List.Section title={`${transResultsState[0].from.langTitle} -> ${transResultsState[0].to.langTitle}`}>
          {transResultsState.map((transRes) => {
            if (transRes.code === TransAPIErrCode.Fail || transRes.code === TransAPIErrCode.Retry) {
              return <TranslateError key={transRes.serviceProvider} transRes={transRes} />;
            } else {
              return <TranslateResult key={transRes.serviceProvider} transRes={transRes} onLangUpdate={translate} />;
            }
          })}
        </List.Section>
      )}
    </List>
  );
}
