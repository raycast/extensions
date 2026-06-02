# Say It Right

**Turn English text or Chinese intent into spoken-English practice.** Select a sentence anywhere on your Mac and Say It Right shows you exactly _how to say it_ — which words to stress, where your pitch should rise and fall, the rhythm, and the connected‑speech links — then reads it aloud as a clear model you can slow down, loop, and shadow. If you start from Chinese intent, it first turns what you mean into natural English and then lets you practice that English.

Made for non‑native speakers, presenters, and anyone who wants their spoken English to sound natural.

## Why it's different

Most tools either read text aloud flatly or drill isolated words. Say It Right tackles what learners actually struggle with — **the melody of a whole sentence.** It maps the _up‑and‑down_ of English (sentence stress, rising/falling intonation, thought‑group pauses, rhythm) onto the words themselves, then gives you a model voice to imitate. No file to import, no setup ritual: highlight text, get a lesson.

## Features

- **Prosody, visualized.** A monospace "stave" places the marks right above the words: stressed syllables (`●`), reduced syllables (`·`), the rising/falling tone (`↗` `↘`) on each thought group, pauses (`‖`), and connected‑speech links (`‿`) — with General American IPA.
- **Model reading via neural TTS** — a clear, natural voice from Qwen, MiMo, Gemini, or OpenAI.
- **Practice controls built for how you actually learn:**
  - Play at normal, **0.75×**, or **0.5×** — slowed without the chipmunk/pitch shift.
  - **Shadowing Loop** auto‑repeats the line N times with a gap, so you can speak along.
  - **Save the model audio** to Downloads for offline practice.
  - **Step through long passages** sentence by sentence.
  - **Page through long passages** in batches, with each sentence analyzed and cached as it becomes ready.
- **Expression Coach** — the former Rewrite & Coach job now lives here: turn selected Chinese intent, clipboard text, or a typed intention into natural English, with a short "Why This Works" note explaining the key wording and tone choices.
- **Tone presets for expression** — switch generated English between Natural, Casual, Formal, and Concise from the action panel, then send the result straight into pronunciation practice.
- **Validation-gated prompts** — built-in expression and prosody prompts include SkillOpt-style self-check gates for schema, fidelity, naturalness, speakability, and coaching usefulness.
- **Translate inside practice** — translate the active sentence or current page for comprehension while studying English text.
- **Select one word → get an example.** It writes a natural sentence using that word and coaches it.
- **Bring your own provider.** Add a Qwen, MiMo, Gemini, or OpenAI key; whichever you have is used automatically. Switch on the fly to compare voices and analyses.

## Commands

Say It Right is layered around the way learners expect to move from meaning to speech:

- **Expression Coach** — `Say Selection in English`, `Say Clipboard in English`, and `Say What I Mean` turn intent into natural English plus a short "Why This Works" note.
- **Pronunciation Coach** — `Analyze Selected English` and `Practice English` explain stress, rhythm, IPA, thought groups, and intonation for English text.
- **Practice & Voice** — playback, slow read, loop, save audio, and voice/model switching help you shadow the final English line.
- **Practice Translation** — translation inside the practice view is only for comprehension while reading English; it is not the expression-rewrite surface.

- **Analyze Selected English** — highlight English text in any app, trigger the command (pairs nicely with a global hotkey), and see how to say it.
- **Practice English** — type or paste a line directly.
- **Say Selection in English** — highlight Chinese intent or rough wording and turn it into natural English you can practice aloud.
- **Say Clipboard in English** — use the current clipboard text as the intent source and turn it into natural English.
- **Say What I Mean** — type a Chinese intention and rewrite it as natural English instead of literal word-by-word translation.

The coaching commands open the same practice view, with every action available in the `⌘K` action panel:

| Action                            | Shortcut      |
| --------------------------------- | ------------- |
| Play                              | `↵`           |
| Play slow `0.75×` / slower `0.5×` | `⌘S` / `⌘⇧S`  |
| Shadowing loop                    | `⌘⇧L`         |
| Repeat last                       | `⌘R`          |
| Next / previous sentence          | `⌘⇧N` / `⌘⇧P` |
| Save model audio                  | `⌘⇧E`         |
| Switch analysis provider          | `⌘⇧O`         |
| Translate sentence / page         | `⌘T` / `⌘⇧T`  |
| Practice generated English        | `⌘↵`          |

Expression commands also include a **Tone** picker: Natural, Casual, Formal, or Concise. Preferences keep durable defaults for coach provider/model and voice provider/model; the action panel handles the current task with direct pickers for **coach provider**, **coach model**, **voice provider**, and **voice model**. Runtime choices are remembered, so switching from OpenAI to Qwen once keeps Qwen as the next starting point.

## Division with AI Translate

Use **AI Translate** for general translation, screenshot OCR, captured UI text, provider comparison, and copy-ready bilingual reading. Use **Say It Right** for English expression and speech practice: natural English wording, pronunciation analysis, model audio, slow playback, and shadowing.

In practice: AI Translate answers "what does this text mean in another language?" Say It Right answers "how should I say this naturally in English, why does that wording work, and how do I pronounce it?"

## Setup

Open the extension's preferences and add **at least one** API key:

- **Qwen Token Plan + DashScope** — analysis (`qwen3.6-flash`, `qwen3.7-plus`, `qwen3.7-max`) uses the Token Plan Anthropic base URL (`https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic` by default). Speech (`qwen3-tts-flash`, `qwen3-tts-instruct-flash`) uses a separate DashScope key and region.
- **MiMo / Xiaomi** — analysis (`mimo-v2.5`, `mimo-v2.5-pro`) uses the Token Plan Anthropic endpoint (`https://token-plan-cn.xiaomimimo.com/anthropic` by default). Speech (`mimo-v2.5-tts`) maps the same cluster to its OpenAI-compatible `/v1` endpoint.
- **Gemini** — analysis (`gemini-3.5-flash`, `gemini-3.1-pro-preview`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview`) and speech (`gemini-3.1-flash-tts-preview`).
- **OpenAI** — analysis (`gpt-5.5`) and speech (`gpt-4o-mini-tts`).

Whichever key you fill is used automatically; if you add several, choose preferred defaults at the top of Preferences. Preferences keep only durable setup choices such as keys, base URLs, default coach model, default voice model, voices, the practice translation target, sentences per page, and the shadowing-loop count and gap. Per-run provider/model switching lives in the action panel.

## Visualization legend

`●` stressed syllable · `·` unstressed · `↗` / `↘` rising / falling tone · `‖` thought‑group pause · `‿` linking · **UPPERCASE** = the stressed syllable of a content word (e.g. `FIN·ish`).

## Privacy

You bring your own API key. Keys are stored in Raycast's secure preferences and are sent only to the provider you choose. The text you analyze is sent to that provider to produce the analysis and the spoken audio — nothing else leaves your Mac, and there is no telemetry or account.

## Requirements

macOS (audio plays through the built‑in `afplay`).
