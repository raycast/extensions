import {
  Alert,
  Clipboard,
  closeMainWindow,
  confirmAlert,
  getSelectedText,
  showHUD,
} from "@raycast/api";
import {
  ConversionSet,
  convertToLayouts,
  readField,
  selectAllInField,
  selectSource,
  shouldFallBackToWholeField,
  shouldSwitchAfterConvert,
} from "./input-source";

/**
 * Rewriting a whole field is welcome in a search box or a chat input and
 * alarming in a document, and the two are indistinguishable from here. Anything
 * past this much text asks first.
 */
const CONFIRM_ABOVE_CHARACTERS = 200;

export type Selection = {
  text: string;
  result: ConversionSet;
  /** True when the text came from the whole focused field rather than a selection. */
  wholeField: boolean;
  appName?: string;
};

/**
 * Reads the text to convert, preferring an explicit selection and falling back to
 * the entire focused field.
 *
 * getSelectedText has to run before anything closes the Raycast window, since it
 * reads the selection of whatever app was in front.
 */
export async function readSelectionAndConvert(): Promise<
  { ok: true; selection: Selection } | { ok: false; message: string }
> {
  let text = "";
  let wholeField = false;
  let appName: string | undefined;

  try {
    text = await getSelectedText();
  } catch {
    text = "";
  }

  // Deliberately untrimmed: a selection of nothing but whitespace is still an
  // explicit selection, and escalating it to a whole-field rewrite would replace
  // far more than the user pointed at. It falls through to the "Nothing to
  // convert" check below instead.
  if (!text) {
    if (!shouldFallBackToWholeField()) {
      return { ok: false, message: "Select some text first" };
    }

    try {
      const field = await readField();
      text = field.text;
      appName = field.appName;
      wholeField = true;
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (!text.trim()) {
    return { ok: false, message: "Nothing to convert" };
  }

  try {
    return {
      ok: true,
      selection: {
        text,
        result: await convertToLayouts(text),
        wholeField,
        appName,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Replaces the text with its converted form, then optionally switches the input
 * source so the user can carry on typing in the language they meant.
 *
 * When the text came from the whole field rather than a selection, the field has
 * to be selected first so the paste replaces it instead of inserting alongside.
 */
export async function applyConversion(
  text: string,
  layoutId: string,
  selection: Selection,
) {
  if (selection.wholeField) {
    if (!(await confirmWholeFieldRewrite(selection))) return;

    // Hand focus back before selecting the field, so the selection and the paste
    // that follows it act on the same window. The confirmation above has to come
    // first — an alert needs the Raycast window it is closing.
    await closeMainWindow();

    try {
      await selectAllInField();
    } catch (error) {
      await showHUD(error instanceof Error ? error.message : String(error));
      return;
    }
  }

  await Clipboard.paste(text);

  if (shouldSwitchAfterConvert()) {
    try {
      await selectSource(layoutId);
    } catch (error) {
      // The text is already fixed at this point, so a failed switch is worth
      // reporting but not worth treating as a failed conversion.
      await showHUD(
        `Converted, but could not switch layout: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}

async function confirmWholeFieldRewrite(selection: Selection) {
  if (selection.text.length <= CONFIRM_ABOVE_CHARACTERS) return true;

  return await confirmAlert({
    title: "Replace everything in this field?",
    message: `Nothing was selected, so this will rewrite all ${selection.text.length} characters in ${
      selection.appName ?? "the frontmost app"
    }. Undo with Command-Z if it goes wrong.`,
    primaryAction: {
      title: "Replace All",
      style: Alert.ActionStyle.Destructive,
    },
  });
}
