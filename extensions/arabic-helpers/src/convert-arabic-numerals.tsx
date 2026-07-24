import { Action, Form, getPreferenceValues, Icon } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { ClipboardHistorySubmenu } from "./components/clipboard-history-submenu";
import { ConversionActions } from "./components/conversion-actions";
import { detectFirstNumeralSystem, toArabicIndicNumerals, toWesternNumerals } from "./lib/conversions";
import { readClipboardText } from "./lib/clipboard";
import { getInitialText } from "./lib/initial-text";

type ExtensionPreferences = {
  preloadTextAutomatically: boolean;
};

export default function ConvertArabicNumerals() {
  const { preloadTextAutomatically } = getPreferenceValues<ExtensionPreferences>();
  const westernRef = useRef<Form.TextArea>(null);
  const arabicIndicRef = useRef<Form.TextArea>(null);
  const [westernText, setWesternText] = useState("");
  const [arabicIndicText, setArabicIndicText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    getInitialText(preloadTextAutomatically)
      .then((text) => {
        if (isCancelled) return;

        const detectedSystem = detectFirstNumeralSystem(text) ?? "western";
        setWesternText(toWesternNumerals(text));
        setArabicIndicText(toArabicIndicNumerals(text));

        setTimeout(() => {
          if (detectedSystem === "arabic-indic") {
            arabicIndicRef.current?.focus();
          } else {
            westernRef.current?.focus();
          }
        }, 0);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [preloadTextAutomatically]);

  const clear = () => {
    setWesternText("");
    setArabicIndicText("");
    westernRef.current?.focus();
  };

  const loadText = (text: string) => {
    const detectedSystem = detectFirstNumeralSystem(text) ?? "western";
    setWesternText(toWesternNumerals(text));
    setArabicIndicText(toArabicIndicNumerals(text));

    setTimeout(() => {
      if (detectedSystem === "arabic-indic") {
        arabicIndicRef.current?.focus();
      } else {
        westernRef.current?.focus();
      }
    }, 0);
  };

  const pasteClipboard = async () => {
    const text = await readClipboardText();
    if (text === undefined) return;
    loadText(text);
  };

  const primary = { label: "Arabic-Indic Text", text: arabicIndicText };
  const secondary = { label: "Western Text", text: westernText };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ConversionActions
          primary={primary}
          secondary={secondary}
          mainAction={<ClipboardHistorySubmenu targetLabel="Numerals" onSelect={loadText} />}
          quickInputAction={
            <Action title="Paste Clipboard and Detect Numerals" icon={Icon.Clipboard} onAction={pasteClipboard} />
          }
          onClear={clear}
        />
      }
    >
      <Form.TextArea
        id="westernText"
        ref={westernRef}
        title="Western Numerals"
        placeholder="Example: لدي 3 كتب في 2 حقائب"
        info="Uses 0–9. Editing this area updates the Arabic-Indic area immediately."
        value={westernText}
        onChange={(text) => {
          setWesternText(text);
          setArabicIndicText(toArabicIndicNumerals(text));
        }}
      />
      <Form.TextArea
        id="arabicIndicText"
        ref={arabicIndicRef}
        title="Arabic-Indic Numerals"
        placeholder="مثال: لدي ٣ كتب في ٢ حقائب"
        info="Uses ٠–٩. Editing this area updates the Western area immediately."
        value={arabicIndicText}
        onChange={(text) => {
          setArabicIndicText(text);
          setWesternText(toWesternNumerals(text));
        }}
      />
    </Form>
  );
}
