// The contract both front ends share: the 7TV query, and which file to fetch for an emote.
// Plain ES module, no build step — the web app imports it over HTTP, the Raycast extension
// bundles it. Anything platform-specific (clipboard formats, pasting) stays in the callers.

export const CDN = "https://cdn.7tv.app/emote/";
export const SIZES = ["1x", "2x", "3x", "4x"];
export const PER_PAGE = 60;
export const MAX_PAGE = 100; // the API rejects page > 100 outright

/** @typedef {{ id: string, name: string, animated: boolean, files: string[] }} Emote */

// Animated emotes ship gif+webp+avif and no png; static ship png+webp+avif and no gif.
// So resolve against the file list the API actually returned, never a guessed URL.
// gif:false is for callers whose clipboard refuses GIF — they get the static path instead.
/** @param {Emote} e @param {string} size @param {{ gif?: boolean }} [opts] */
export function pickFile(e, size, opts) {
  const gif = !opts || opts.gif !== false;
  const order = [size, ...SIZES.filter((s) => s !== size)]; // preferred size, then fall back
  const near = (ext) => order.map((s) => s + "." + ext).find((n) => e.files.includes(n));

  const file = (gif && e.animated && near("gif")) || near("png") || near("webp");
  if (!file) throw new Error(e.name + ": no usable file in " + e.files.join(", "));
  const [got, ext] = file.split(".");
  return { url: CDN + e.id + "/" + file, file, size: got, ext };
}

const QUERY =
  "query($q:String!,$p:Int!,$f:EmoteSearchFilter){emotes(query:$q,page:$p,limit:" +
  PER_PAGE +
  ',filter:$f,sort:{value:"popularity",order:DESCENDING}){count items{id name animated host{files{name}}}}}';

/** @param {string} query @param {number} page @returns {Promise<{ count: number, items: Emote[] }>} */
export async function searchEmotes(query, page) {
  const body = {
    query: QUERY,
    variables: {
      q: query,
      p: page,
      f: {
        category: "TOP",
        exact_match: false,
        case_sensitive: false,
        ignore_tags: false,
        zero_width: false,
        animated: false,
        aspect_ratio: "",
      },
    },
  };
  const r = await fetch("https://7tv.io/v3/gql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());
  const d = r.data && r.data.emotes;
  if (!d) throw new Error((r.errors && r.errors[0].message) || "bad response");
  return {
    count: d.count,
    items: d.items.map((e) => ({
      id: e.id,
      name: e.name,
      animated: e.animated,
      files: e.host.files.map((f) => f.name),
    })),
  };
}
