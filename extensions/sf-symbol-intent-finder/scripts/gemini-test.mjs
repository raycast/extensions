// Local harness to verify the live Gemini call + response shape WITHOUT touching
// Raycast. Reads the key from .gemini-key (gitignored) and never prints it.
//
//   node scripts/gemini-test.mjs --list                 # list models the key can use
//   node scripts/gemini-test.mjs <model> "<query>"      # run an intent search
//
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let key;
try {
  key = readFileSync(join(root, ".gemini-key"), "utf8").trim();
} catch {
  console.error("Missing .gemini-key file. See instructions.");
  process.exit(1);
}
if (!key) {
  console.error(".gemini-key is empty.");
  process.exit(1);
}

const BASE = "https://generativelanguage.googleapis.com/v1beta";

// Redact the key if it ever appears in an error string, so it can't leak to the transcript.
const redact = (s) => String(s).split(key).join("***KEY***");

async function listModels() {
  const res = await fetch(`${BASE}/models?key=${key}`);
  if (!res.ok) throw new Error(`list failed ${res.status}: ${redact(await res.text())}`);
  const json = await res.json();
  const usable = (json.models ?? []).filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"));
  console.log("Models supporting generateContent:");
  for (const m of usable) console.log("  " + m.name.replace("models/", ""));
}

async function intent(model, query) {
  const data = JSON.parse(readFileSync(join(root, "assets/symbols/data.json"), "utf8"));
  const byName = new Map(data.symbols.map((s) => [s.name, s]));
  const ios = (s) => data.versions[String(s.availableFrom)]?.iOS;

  const prompt = [
    "You are an expert on Apple's SF Symbols catalog.",
    "The user is searching for an icon by INTENT or meaning, not by its literal name.",
    `The user's query is: "${query}".`,
    "Return up to 18 real SF Symbol names whose meaning or common use matches this intent,",
    "ordered from best to weakest match.",
    "Use exact lowercase dotted identifiers (for example: arrow.uturn.backward, trash, square.and.arrow.up).",
    "Only include symbols you are confident actually exist. Do not invent names. Do not add explanations.",
  ].join(" ");

  const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: { symbols: { type: "array", items: { type: "string" } } },
          required: ["symbols"],
        },
      },
    }),
  });

  console.log(`HTTP ${res.status} for model "${model}"`);
  const text = await res.text();
  if (!res.ok) {
    console.log("Body:", redact(text));
    return;
  }
  const json = JSON.parse(text);
  const raw = JSON.parse(json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}").symbols ?? [];
  console.log("Raw model names:   ", raw);
  const valid = raw.filter((n) => byName.has(n));
  const dropped = raw.filter((n) => !byName.has(n));
  console.log("Validated (in catalog):", valid.map((n) => `${n} (iOS ${ios(byName.get(n))})`));
  if (dropped.length) console.log("Dropped (hallucinated):", dropped);
}

const [, , arg1, arg2] = process.argv;
if (arg1 === "--list" || !arg1) {
  await listModels();
} else {
  await intent(arg1, arg2 ?? "undo");
}
