// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as friendlyTruncate from "friendly-truncate";
import { is } from "ramda";

const MAX_TEXT_LENGTH = 60;

const isString = (value: unknown): value is string => is(String)(value);
const toId = (value: string) => value.replace(/\s/g, "-");
const truncate = (text: string) => friendlyTruncate.truncateEnd(text, MAX_TEXT_LENGTH);

export { isString, toId, truncate };
