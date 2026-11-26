import { fetchTranscript, toSrt, clock } from "../src/transcript.ts";
globalThis.fetch = (async () => ({ ok: true, json: async () => [{ videoId: "abc", status: "OK", title: "T",
  segments: [{ text: "Hello", start: 0, dur: 1.5 }, { text: "world", start: 3725.25, dur: 2 }],
  translation: { segments: [{ text: "Hallo", start: 0, dur: 1.5 }] } }] })) as any;
const t = await fetchTranscript("abc", "tok");
console.log(t.segments.length, clock(t.segments[1].start), JSON.stringify(toSrt(t.segments)));
console.log((await fetchTranscript("abc", "tok", "de")).segments[0].text);
globalThis.fetch = (async () => ({ ok: true, json: async () => [{ videoId: "x", status: "NO_CAPTIONS" }] })) as any;
await fetchTranscript("x", "tok").catch((e) => console.log(e.message));
