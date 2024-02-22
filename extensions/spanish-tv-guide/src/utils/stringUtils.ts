// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as friendlyTruncate from "friendly-truncate";

const MAX_TEXT_LENGTH = 60;

const truncate = (text: string) => friendlyTruncate.truncateEnd(text, MAX_TEXT_LENGTH);

export { truncate };
