import {
  List,
  getPreferenceValues,
  ActionPanel,
  Action,
  Icon,
  openCommandPreferences,
  showToast,
  Toast,
  environment,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { OCR_SERVICES_NAMES, OCR_SUPPORT_IMG_TYPE, TransAPIErrCode } from "./common/const";
import {
  capture,
  checkOCRPreferences,
  checkPreferences,
  fetchTransAPIs,
  getLang,
  getServiceProviderMap,
  getTextFromPic,
  saveHistory,
  translateWithRefineLang,
} from "./common/itranslate.shared";
import { TranslateError, TranslateNotSupport } from "./components/TranslateError";
import { TranslateHistory } from "./components/TranslateHistory";
import { TranslateResult } from "./components/TranslateResult";
import { Action$ } from "raycast-toolkit";
import path from "node:path";

let delayFetchTranslateAPITimer: NodeJS.Timeout;

export default function Command() {
  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  const langSecond: ILangItem = getLang(preferences.langSecond);
  let check = checkPreferences();
  if (check) return check;
  check = checkOCRPreferences();
  if (check) return check;

  const [inputState, updateInputState] = useState<string>("");
  const [inputTempState, updateInputTempState] = useState<string>("");
  const [isLoadingState, updateLoadingState] = useState<boolean>(false);
  const [isShowDetail, updateShowDetail] = useState<boolean>(false);
  const [transResultsState, updateTransResultsState] = useState<ITranslateRes[]>([]);
  const [currentTargetLang, updateCurrentTargetLang] = useState<ILangItem>(getLang(preferences.langFirst));

  useEffect(() => {
    preferences.captureOnActivated && captureImg();
  }, []);

  async function captureImg() {
    try {
      const capturePath = await capture(preferences.closeOnCapture);
      await imgPathTrigger(capturePath);
    } catch (error) {
      showToast({ title: "Capture failed", style: Toast.Style.Failure });
    }
  }

  async function selectImg(imgPath: string) {
    if (!OCR_SUPPORT_IMG_TYPE.includes(path.extname(imgPath))) {
      showToast({
        title: `${path.extname(imgPath).toUpperCase()} images are not supported`,
        style: Toast.Style.Failure,
      });
      return;
    }
    await imgPathTrigger(imgPath);
  }

  function onImgOCR(path?: string) {
    if (path) {
      selectImg(path);
    } else {
      captureImg();
    }
  }

  async function imgPathTrigger(imgPath: string) {
    try {
      if (imgPath) {
        showToast({
          title: "Extracting text from image...",
          message: `Powered by ${OCR_SERVICES_NAMES.get(preferences.ocrServiceProvider)}`,
          style: Toast.Style.Animated,
        });
        const textFromImg = await getTextFromPic(imgPath);
        const text = textFromImg.trim();
        if (text.length > 0) {
          updateInputState(text);
          updateInputTempState(text);
        }
        showToast({ title: "Extract text from image successfully", style: Toast.Style.Success });
      }
    } catch (error) {
      showToast({ title: "Failed to extract text from image", message: error as string, style: Toast.Style.Failure });
    }
  }

  useEffect(() => {
    if (inputTempState.trim().length > 0) {
      translate(currentTargetLang);
    } else {
      updateTransResultsState([]);
      updateShowDetail(false);
    }
  }, [inputTempState]);

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
          if (preferences.enableHistory) {
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
    return (
      <ActionPanel>
        <Action icon={Icon.Maximize} title="Capture to Translate" onAction={captureImg} />
        <Action$.SelectFile
          title="Select Image to Translate"
          icon={Icon.Finder}
          onSelect={(filePath) => {
            if (!filePath) {
              return;
            }
            selectImg(filePath);
          }}
        />
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
          title="Open Command Preferences"
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
      onSearchTextChange={onInputChange}
      actions={ListActions()}
    >
      <List.EmptyView
        title="Capture or select image to translate..."
        icon={{ source: `no-view@${environment.theme}.png` }}
      />
      {transResultsState.map((transRes) => {
        if (transRes.code === TransAPIErrCode.Fail || transRes.code === TransAPIErrCode.Retry) {
          return <TranslateError key={transRes.serviceProvider} transRes={transRes} />;
        } else if (transRes.code === TransAPIErrCode.NotSupport) {
          return <TranslateNotSupport key={transRes.serviceProvider} transRes={transRes} />;
        } else {
          return (
            <TranslateResult
              key={transRes.serviceProvider}
              transRes={transRes}
              onLangUpdate={translate}
              onImgOCR={onImgOCR}
            />
          );
        }
      })}
    </List>
  );
}
