import React, { useState, useEffect, useCallback } from "react";
import crypto from "crypto";
import { Form, ActionPanel, Action, Clipboard, showToast, Toast, getPreferenceValues } from "@raycast/api";

const translations = {
  en: {
    length: "Length",
    lengthError: "Value must be between 13 and 128.",
    includeChars: "Include Characters",
    minNumbers: "Minimum Numbers",
    minSymbols: "Minimum Symbols",
    copyAction: "Copy Password",
    regenerateAction: "Regenerate",
    copiedToast: "Copied to clipboard",
  },
  ja: {
    length: "長さ",
    lengthError: "値は 13 から 128 の間でなければなりません。",
    includeChars: "含む文字",
    minNumbers: "数字の最小数",
    minSymbols: "記号の最小数",
    copyAction: "パスワードをコピー",
    regenerateAction: "再生成",
    copiedToast: "クリップボードにコピーしました",
  },
  zh_CN: {
    length: "长度",
    lengthError: "值必须在 13 到 128 之间。",
    includeChars: "包含字符",
    minNumbers: "最少数字",
    minSymbols: "最少符号",
    copyAction: "复制密码",
    regenerateAction: "重新生成",
    copiedToast: "已复制到剪贴板",
  },
  zh_TW: {
    length: "長度",
    lengthError: "值必須在 13 到 128 之間。",
    includeChars: "包含字元",
    minNumbers: "最少數字",
    minSymbols: "最少符號",
    copyAction: "複製密碼",
    regenerateAction: "重新生成",
    copiedToast: "已複製到剪貼簿",
  },
  ko: {
    length: "길이",
    lengthError: "값은 13에서 128 사이여야 합니다.",
    includeChars: "포함할 문자",
    minNumbers: "최소 숫자 수",
    minSymbols: "최소 기호 수",
    copyAction: "암호 복사",
    regenerateAction: "재생성",
    copiedToast: "클립보드에 복사되었습니다",
  },
  ru: {
    length: "Длина",
    lengthError: "Значение должно быть от 13 до 128.",
    includeChars: "Использовать символы",
    minNumbers: "Минимум цифр",
    minSymbols: "Минимум спецсимволов",
    copyAction: "Скопировать пароль",
    regenerateAction: "Сгенерировать заново",
    copiedToast: "Скопировано в буфер обмена",
  },
  es: {
    length: "Longitud",
    lengthError: "El valor debe estar entre 13 y 128.",
    includeChars: "Incluir caracteres",
    minNumbers: "Mínimo de números",
    minSymbols: "Mínimo de símbolos",
    copyAction: "Copiar contraseña",
    regenerateAction: "Regenerar",
    copiedToast: "Copiado al portapapeles",
  },
  fr: {
    length: "Longueur",
    lengthError: "La valeur doit être comprise entre 13 et 128.",
    includeChars: "Inclure des caractères",
    minNumbers: "Minimum de chiffres",
    minSymbols: "Minimum de symboles",
    copyAction: "Copier le mot de passe",
    regenerateAction: "Régénérer",
    copiedToast: "Copié dans le presse-papiers",
  },
  de: {
    length: "Länge",
    lengthError: "Der Wert muss zwischen 13 und 128 liegen.",
    includeChars: "Zeichen einschließen",
    minNumbers: "Mindestanzahl Zahlen",
    minSymbols: "Mindestanzahl Symbole",
    copyAction: "Passwort kopieren",
    regenerateAction: "Neu generieren",
    copiedToast: "In die Zwischenablage kopiert",
  }
} as const;

type Language = keyof typeof translations;

export default function Command() {
  const { language } = getPreferenceValues<{ language: Language }>();
  const t = translations[language] || translations.en;

  const [password, setPassword] = useState("");
  
  const [length, setLength] = useState("15");
  const [lengthError, setLengthError] = useState<string | undefined>();

  const [useUppercase, setUseUppercase] = useState(true);
  const [useLowercase, setUseLowercase] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);

  const [minNumbers, setMinNumbers] = useState("2");
  const [minSymbols, setMinSymbols] = useState("9");

  const handleLengthChange = (newValue: string) => {
    setLength(newValue);
    const num = parseInt(newValue, 10);
    if (isNaN(num) || num < 13 || num > 128) {
      setLengthError(t.lengthError);
    } else {
      setLengthError(undefined);
    }
  };

  const generate = useCallback(() => {
    let len = parseInt(length) || 15;
    // UIの制約に合わせて内部的に制限
    if (len < 13) len = 13;
    if (len > 128) len = 128;

    const numCnt = parseInt(minNumbers) || 0;
    const symCnt = parseInt(minSymbols) || 0;

    const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
    const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numberChars = "0123456789";
    const symbolChars = "!@#$%^&*()_+~`|}{[]:;?><,./-=";

    let availableChars = "";
    const reqChars: string[] = [];

    if (useLowercase) {
      availableChars += lowercaseChars;
      reqChars.push(lowercaseChars[crypto.randomInt(lowercaseChars.length)]);
    }

    if (useUppercase) {
      availableChars += uppercaseChars;
      reqChars.push(uppercaseChars[crypto.randomInt(uppercaseChars.length)]);
    }

    if (useNumbers) {
      availableChars += numberChars;
      const count = Math.max(1, numCnt);
      for (let i = 0; i < count; i++) {
        reqChars.push(numberChars[crypto.randomInt(numberChars.length)]);
      }
    }

    if (useSymbols) {
      availableChars += symbolChars;
      const count = Math.max(1, symCnt);
      for (let i = 0; i < count; i++) {
        reqChars.push(symbolChars[crypto.randomInt(symbolChars.length)]);
      }
    }

    if (availableChars.length === 0) {
      setPassword("");
      return;
    }

    const remainingLength = Math.max(0, len - reqChars.length);
    for (let i = 0; i < remainingLength; i++) {
      reqChars.push(availableChars[crypto.randomInt(availableChars.length)]);
    }

    // Shuffle array using Fisher-Yates
    for (let i = reqChars.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [reqChars[i], reqChars[j]] = [reqChars[j], reqChars[i]];
    }

    setPassword(reqChars.join(""));
  }, [length, useLowercase, useUppercase, useNumbers, useSymbols, minNumbers, minSymbols]);

  useEffect(() => {
    generate();
  }, [generate]);

  const handleCopy = async () => {
    await Clipboard.copy(password);
    await showToast({ title: t.copiedToast, style: Toast.Style.Success });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title={t.copyAction} onAction={handleCopy} />
          <Action title={t.regenerateAction} onAction={generate} shortcut={{ modifiers: ["cmd"], key: "r" }} />
        </ActionPanel>
      }
    >
      <Form.TextField 
        id="length" 
        title={t.length} 
        value={length} 
        onChange={handleLengthChange} 
        error={lengthError}
        placeholder="15"
      />
      
      <Form.Separator />
      
      <Form.Checkbox id="useUppercase" title={t.includeChars} label="A-Z" value={useUppercase} onChange={setUseUppercase} />
      <Form.Checkbox id="useLowercase" title="" label="a-z" value={useLowercase} onChange={setUseLowercase} />
      <Form.Checkbox id="useNumbers" title="" label="0-9" value={useNumbers} onChange={setUseNumbers} />
      <Form.Checkbox id="useSymbols" title="" label="!@#$%^&*" value={useSymbols} onChange={setUseSymbols} />

      <Form.Separator />

      {useNumbers && (
        <Form.TextField id="minNumbers" title={t.minNumbers} value={minNumbers} onChange={setMinNumbers} />
      )}
      {useSymbols && (
        <Form.TextField id="minSymbols" title={t.minSymbols} value={minSymbols} onChange={setMinSymbols} />
      )}
    </Form>
  );
}
