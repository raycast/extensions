import { getPreferenceValues, getSelectedText, showToast, Toast, Clipboard } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface QueryHook {
  text: string;
  to: string;
  from: string;
  querying: boolean;
  isLoading: boolean;
  updateText: (arg: string) => Promise<void>;
  updateTo: (arg: string) => Promise<void>;
  updateFrom: (arg: string) => Promise<void>;
  updateQuerying: (arg: boolean) => Promise<void>;
  langType: string;
  updateLangType: (arg: string) => Promise<void>;
  ocrImage: string | undefined;
  updateOcr: (arg: string | undefined) => Promise<void>;
}

export interface UseQueryProps {
  initialQuery?: string;
  forceEnableAutoStart: boolean;
  forceEnableAutoLoadSelected: boolean;
  forceEnableAutoLoadClipboard: boolean;
  ocrImage: string | undefined;
}

export function useQuery(props: UseQueryProps): QueryHook {
  const {
    initialQuery,
    forceEnableAutoStart,
    forceEnableAutoLoadSelected,
    forceEnableAutoLoadClipboard,
    ocrImage: initialOcr,
  } = props;
  const { toLang, isAutoLoadSelected, isAutoLoadClipboard, isAutoStart } = getPreferenceValues<{
    toLang: string;
    isAutoLoadSelected: boolean;
    isAutoLoadClipboard: boolean;
    isAutoStart: boolean;
  }>();
  const [text, setText] = useState<string>(initialQuery || "");
  const [to, setTo] = useState<string>(toLang);
  const [from, setFrom] = useState<string>("auto");
  const [langType, setLangType] = useState("To");
  const [isLoading, setLoading] = useState<boolean>(false);
  const [querying, setQuerying] = useState<boolean>(false);
  const [ocrImage, setOcrImage] = useState<string | undefined>(initialOcr);

  useEffect(() => {
    (async () => {
      let tmp = "";
      if (text.length == 0) {
        if (forceEnableAutoLoadSelected || isAutoLoadSelected) {
          setLoading(true);
          try {
            const selectedText = (await getSelectedText()).trim();
            if (selectedText.length > 1) {
              tmp = selectedText;
              await showToast({
                style: Toast.Style.Success,
                title: "Selected text loaded!",
              });
            }
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Selected text couldn't load",
              message: String(error),
            });
          }
          setLoading(false);
        }
        if (forceEnableAutoLoadClipboard || (isAutoLoadClipboard && tmp.length == 0)) {
          setLoading(true);
          try {
            const { text } = await Clipboard.read();
            if (text.trim().length > 1) {
              tmp = text.trim();
              await showToast({
                style: Toast.Style.Success,
                title: "Clipboard text loaded!",
              });
            }
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Clipboard text couldn't load",
              message: String(error),
            });
          }
          setLoading(false);
        }
        if (tmp.length > 0) {
          setText(tmp);
        }
      } else {
        tmp = text;
      }

      if (tmp.length > 0 && (forceEnableAutoStart || isAutoStart)) {
        updateQuerying(true);
      }
    })();
  }, []);

  const updateText = useCallback(
    async (text: string) => {
      setText(text);
    },
    [setText, text],
  );

  const updateTo = useCallback(
    async (_to: string) => {
      setTo(_to);
    },
    [setTo, to],
  );

  const updateFrom = useCallback(
    async (value: string) => {
      setFrom(value);
    },
    [setFrom, from],
  );

  const updateQuerying = useCallback(
    async (value: boolean) => {
      if (!value && querying) {
        setOcrImage(undefined);
      }
      setQuerying(value);
    },
    [setQuerying, querying],
  );

  const updateLangType = useCallback(
    async (value: string) => {
      setLangType(value);
    },
    [setLangType, langType],
  );

  const updateOcr = useCallback(
    async (value: string | undefined) => {
      setOcrImage(value);
    },
    [setOcrImage, ocrImage],
  );

  return useMemo(
    () => ({
      text,
      to,
      from,
      querying,
      isLoading,
      updateText,
      updateTo,
      updateFrom,
      updateQuerying,
      langType,
      updateLangType,
      ocrImage,
      updateOcr,
    }),
    [
      text,
      to,
      from,
      querying,
      isLoading,
      updateText,
      updateTo,
      updateFrom,
      updateQuerying,
      langType,
      updateLangType,
      ocrImage,
      updateOcr,
    ],
  );
}
