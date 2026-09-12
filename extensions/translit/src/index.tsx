import { Action, ActionPanel, Form, getPreferenceValues, Icon } from "@raycast/api";
import { useState } from "react";

interface Preferences {
  primaryAction: string;
  clearOnAction: boolean;
}

const PRIMARY_ACTIONS = {
  COPY_TO_CLIPBOARD: "copyToClipboard",
  PASTE_TO_ACTIVE_APP: "pasteToActiveApp",
};

const UI_TEXT = {
  FORM: {
    LATIN_INPUT_TITLE: "Latin Input",
    CYRILLIC_OUTPUT_TITLE: "Cyrillic Output",
  },
  ACTIONS: {
    COPY_TITLE: "Copy to Clipboard",
    PASTE_TITLE: "Paste to Active App",
  },
  MESSAGES: {
    COPIED: "copied!",
    PASTED: "pasted!",
    ERROR: "Error occurred while copying/pasting.",
  },
};

const DEFAULT = {
  PLACEHOLDER: "Privet...",
  OUTPUT: "Привет...",
};

const MAX_MUNCH_LENGTH = 3;

const PHONETIC_MAP: Record<string, string[]> = {
  а: ["a"],
  б: ["b"],
  в: ["v"],
  г: ["g"],
  д: ["d"],
  е: ["e"],
  ё: ["yo", "jo", "ö"],
  ж: ["zh"],
  з: ["z"],
  и: ["i"],
  й: ["j"],
  к: ["k"],
  л: ["l"],
  м: ["m"],
  н: ["n"],
  о: ["o"],
  п: ["p"],
  р: ["r"],
  с: ["s"],
  т: ["t"],
  у: ["u"],
  ф: ["f"],
  х: ["h", "x"],
  ц: ["c"],
  ч: ["ch"],
  ш: ["sh"],
  щ: ["shh", "w"],
  ъ: ["#", "tvz"],
  Ъ: ["##"],
  ы: ["y"],
  ь: ["'", "mjz"],
  Ь: ["''"],
  э: ["je", "ä"],
  ю: ["yu", "ju", "ü"],
  я: ["ya", "ja", "q"],
};

// Create reverse mapping for Latin to Cyrillic conversion
const REVERSE_PHONETIC_MAP = Object.entries(PHONETIC_MAP).reduce<Record<string, string>>(
  (acc, [cyrillic, latinVariants]) => {
    latinVariants.forEach((latin) => {
      acc[latin] = cyrillic;
    });
    return acc;
  },
  {},
);

/**
 * Checks if a character is a letter
 * @param char - Single character to check
 * @returns boolean indicating if the character is a letter
 */
function isLetter(char: string): boolean {
  return char.toLowerCase() !== char.toUpperCase();
}

/**
 * Converts Latin text to Cyrillic using phonetic transliteration
 * @param input - Latin text to convert
 * @returns Transliterated Cyrillic text
 */
function transliterateLatinToCyrillic(input: string): string {
  let result = "";
  let i = 0;

  while (i < input.length) {
    let currentLength = MAX_MUNCH_LENGTH;
    let matched = false;

    // Try to match longest possible sequence first
    while (currentLength >= 1) {
      const sequence = input.slice(i, i + currentLength);
      const cyrillicChar = REVERSE_PHONETIC_MAP[sequence.toLowerCase()];

      if (cyrillicChar) {
        const shouldUppercase = isLetter(sequence[0]) && sequence[0] === sequence[0].toUpperCase();
        result += shouldUppercase ? cyrillicChar.toUpperCase() : cyrillicChar;
        i += currentLength;
        matched = true;
        break;
      }
      currentLength--;
    }

    // If no match found, keep the original character
    if (!matched) {
      result += input[i];
      i++;
    }
  }

  return result;
}

export default function Command() {
  const [input, setInput] = useState("");
  const [cyrillicOutput, setCyrillicOutput] = useState("");
  const { primaryAction, clearOnAction } = getPreferenceValues<Preferences>();

  const handleInputChange = (value: string) => {
    setInput(value);
    setCyrillicOutput(transliterateLatinToCyrillic(value));
  };

  const clearInput = () => {
    setInput("");
    setCyrillicOutput("");
  };

  const actionComponents = {
    [PRIMARY_ACTIONS.PASTE_TO_ACTIVE_APP]: (
      <Action.Paste
        key="paste"
        title={UI_TEXT.ACTIONS.PASTE_TITLE}
        icon={Icon.Clipboard}
        content={cyrillicOutput}
        onPaste={() => {
          if (clearOnAction) clearInput();
        }}
      />
    ),
    [PRIMARY_ACTIONS.COPY_TO_CLIPBOARD]: (
      <Action.CopyToClipboard
        key="copy"
        title={UI_TEXT.ACTIONS.COPY_TITLE}
        icon={Icon.Clipboard}
        content={cyrillicOutput}
        onCopy={() => {
          if (clearOnAction) clearInput();
        }}
      />
    ),
  };

  const orderedActionKeys = Object.keys(actionComponents).sort((a, b) =>
    a === primaryAction ? -1 : b === primaryAction ? 1 : 0,
  );

  return (
    <Form actions={<ActionPanel>{orderedActionKeys.map((key) => actionComponents[key])}</ActionPanel>}>
      <Form.TextArea
        id="input"
        title={UI_TEXT.FORM.LATIN_INPUT_TITLE}
        placeholder={DEFAULT.PLACEHOLDER}
        value={input}
        onChange={handleInputChange}
      />
      <Form.Description title={UI_TEXT.FORM.CYRILLIC_OUTPUT_TITLE} text={cyrillicOutput || DEFAULT.OUTPUT} />
    </Form>
  );
}
