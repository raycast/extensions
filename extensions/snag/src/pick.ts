// Everything shared with the web app lives in ../../public/snag.js — the GraphQL query and the
// file choice. Only the typing is here: macOS pastes a real file, so there is nothing to adapt.
export { PER_PAGE, MAX_PAGE, SIZES, pickFile as pick, searchEmotes as search } from "../../public/snag.js";
export type { Emote } from "../../public/snag.js";
