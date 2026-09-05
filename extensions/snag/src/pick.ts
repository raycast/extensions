// The contract shared with the web app lives in ./snag.js — the GraphQL query and the file
// choice. It is canonical here rather than in public/ because publishing to the Raycast Store
// copies only this directory; public/snag.js is a copy kept honest by `just test`.
// Only the typing is here: macOS pastes a real file, so there is nothing to adapt.
export { PER_PAGE, MAX_PAGE, SIZES, pickFile as pick, searchEmotes as search } from "./snag.mjs";
export type { Emote } from "./snag.mjs";
