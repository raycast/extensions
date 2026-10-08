import { Clipboard, getSelectedText } from "@raycast/api";

/**
 * Given a starting point, a destination, and a engine for traveling method, returns a direction url according to the OpenStreetMaps specs:
 *
 * @param from The origin address
 * @param to The destination address
 * @param engine One of four possible travel modes
 * @returns An URI encoded string according to OpenStreetMaps
 */
export const makeDirectionsURL = (from: string, to: string, engine: string): string =>
  `https://www.openstreetmap.org/directions?from=${encodeURI(from)}&to=${encodeURI(to)}&engine=${encodeURI(engine)}`;

/**
 * Given a query string, returns search url
 *
 * @param query The queried address
 * @returns A properly URI encoded string according to OpenStreetMaps API
 */
export const makeSearchURL = (query: string): string => `https://www.openstreetmap.org/?query=${encodeURI(query)}`;

/**
 * @returns Get selected text otherwise get clipboard text
 */
export const getInputText = async () => {
  return getSelectedText()
    .then(async (text) => (!isEmpty(text) ? text : await getClipboardText()))
    .catch(async () => await getClipboardText())
    .then((item) => (!isEmpty(item) ? item : ""))
    .catch(() => "" as string);
};

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

const getClipboardText = async () => {
  const content = await Clipboard.readText();
  return typeof content == "undefined" ? "" : content;
};
