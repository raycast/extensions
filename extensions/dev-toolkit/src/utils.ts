import { Clipboard, closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";

export const safeNumberArg = async (
  arg: string | undefined,
  options: {
    max?: number;
    min?: number;
    default?: number;
  } = {},
) => {
  // Set defaults
  const max = options.max !== undefined ? options.max : Number.MAX_SAFE_INTEGER;
  const min = options.min !== undefined ? options.min : 0;
  const defaultValue = options.default !== undefined ? options.default : 1;

  // Default value if no argument provided
  if (!arg) {
    return {
      error: null,
      safeNumber: defaultValue,
    };
  }

  try {
    const parseableNumber = parseInt(arg, 10);

    // Validation checks
    if (isNaN(parseableNumber)) {
      return {
        error: {
          message: "Please enter a valid integer number",
        },
        safeNumber: null,
      };
    }

    if (parseableNumber > max) {
      return {
        error: {
          message: `Please enter a number no more than ${max}`,
        },
        safeNumber: null,
      };
    }

    if (parseableNumber < min) {
      return {
        error: {
          message: `Please enter a number no less than ${min}`,
        },
        safeNumber: null,
      };
    }

    return {
      error: null,
      safeNumber: parseableNumber,
    };
  } catch (e) {
    return {
      error: {
        message: "Something went wrong while parsing the number",
      },
      safeNumber: null,
    };
  }
};

export const showError = async (msg: string) => {
  await closeMainWindow();
  await showToast(Toast.Style.Failure, msg);
};

export const produceOutput = async (content: string) => {
  const { action } = getPreferenceValues();

  await closeMainWindow();

  switch (action) {
    case "clipboard":
      await Clipboard.copy(content);
      await showToast(Toast.Style.Success, "Copied to clipboard! 📋");
      break;

    case "paste":
      await Clipboard.paste(content);
      await showToast(Toast.Style.Success, "Pasted to active app! 📝");
      break;

    case "pasteAndCopy":
      await Clipboard.paste(content);
      await Clipboard.copy(content);
      await showToast(Toast.Style.Success, "Pasted to active app and copied to clipboard! 📋");
      break;
  }
};
