import { ActionPanel, Action, List, Icon } from "@raycast/api";

const BASE = "https://strudel.cc";

type DocPage = {
  title: string;
  slug: string;
  description?: string;
};

type DocSection = {
  name: string;
  prefix: string;
  icon: Icon;
  pages: DocPage[];
};

const SECTIONS: DocSection[] = [
  {
    name: "Learn",
    prefix: "learn",
    icon: Icon.Book,
    pages: [
      { title: "Getting Started", slug: "getting-started", description: "Install and run your first pattern" },
      { title: "Mini Notation", slug: "mini-notation", description: "Tidal mini notation syntax" },
      { title: "Sounds", slug: "sounds", description: "Available sounds and samples" },
      { title: "Notes", slug: "notes", description: "Pitch and note syntax" },
      { title: "Effects", slug: "effects", description: "Audio effects and parameters" },
      { title: "Time Modifiers", slug: "time-modifiers", description: "Speed, slow, fast, cpm" },
      { title: "Conditional Modifiers", slug: "conditional-modifiers", description: "every, when, someCycles" },
      { title: "Random Modifiers", slug: "random-modifiers", description: "rand, choose, degrade" },
      { title: "Signals", slug: "signals", description: "Continuous signal patterns" },
      { title: "LFO", slug: "lfo", description: "Low-frequency oscillators" },
      { title: "Tonal", slug: "tonal", description: "Scales, chords, voicings" },
      { title: "Synths", slug: "synths", description: "Built-in synthesizers" },
      { title: "Samples", slug: "samples", description: "Sample playback and banks" },
      { title: "Factories", slug: "factories", description: "Pattern factory functions" },
      { title: "Accumulation", slug: "accumulation", description: "Pattern state and accumulation" },
      { title: "Stepwise", slug: "stepwise", description: "Step-based pattern tools" },
      { title: "Visual Feedback", slug: "visual-feedback", description: "Highlighting and visualization" },
      { title: "Hydra", slug: "hydra", description: "Hydra visual integration" },
      { title: "Csound", slug: "csound", description: "Csound integration" },
      { title: "Input Devices", slug: "input-devices", description: "MIDI, gamepad, sensors" },
      { title: "Input / Output", slug: "input-output", description: "MIDI I/O and OSC" },
      { title: "FAQ", slug: "faq", description: "Frequently asked questions" },
      { title: "Strudel vs Tidal", slug: "strudel-vs-tidal", description: "Differences from TidalCycles" },
    ],
  },
  {
    name: "Workshop",
    prefix: "workshop",
    icon: Icon.Hammer,
    pages: [
      { title: "Getting Started", slug: "getting-started", description: "Workshop intro" },
      { title: "First Sounds", slug: "first-sounds", description: "Make your first sound" },
      { title: "First Notes", slug: "first-notes", description: "Play melodic notes" },
      { title: "First Effects", slug: "first-effects", description: "Add effects to patterns" },
      { title: "Pattern Effects", slug: "pattern-effects", description: "Effect patterns and modulation" },
      { title: "Recap", slug: "recap", description: "Workshop summary" },
    ],
  },
  {
    name: "Recipes",
    prefix: "recipes",
    icon: Icon.List,
    pages: [
      { title: "Recipes Overview", slug: "recipes", description: "Pattern recipe index" },
      { title: "Arpeggios", slug: "arpeggios", description: "Arpeggio patterns" },
      { title: "Rhythms", slug: "rhythms", description: "Rhythmic patterns" },
      { title: "Microrhythms", slug: "microrhythms", description: "Euclidean and micro-timing" },
    ],
  },
  {
    name: "Understand",
    prefix: "understand",
    icon: Icon.Minimize,
    pages: [
      { title: "Cycles", slug: "cycles", description: "How cycles work in Strudel" },
      { title: "Pitch", slug: "pitch", description: "Pitch representation" },
      { title: "Voicings", slug: "voicings", description: "Chord voicing system" },
    ],
  },
  {
    name: "Technical Manual",
    prefix: "technical-manual",
    icon: Icon.Cog,
    pages: [
      { title: "About", slug: "about", description: "Project overview" },
      { title: "Patterns", slug: "patterns", description: "Pattern internals" },
      { title: "Alignment", slug: "alignment", description: "Pattern alignment model" },
      { title: "Internals", slug: "internals", description: "Core internals" },
      { title: "Packages", slug: "packages", description: "Package structure" },
      { title: "REPL", slug: "repl", description: "REPL implementation" },
      { title: "Sounds", slug: "sounds", description: "Sound system internals" },
      { title: "Testing", slug: "testing", description: "Test infrastructure" },
      { title: "Helix", slug: "helix", description: "Helix editor integration" },
      { title: "Vim", slug: "vim", description: "Vim editor integration" },
    ],
  },
  {
    name: "Functions",
    prefix: "functions",
    icon: Icon.Code,
    pages: [
      { title: "Intro", slug: "intro", description: "Function reference overview" },
      { title: "Value Modifiers", slug: "value-modifiers", description: "Per-event value transforms" },
    ],
  },
];

function docUrl(prefix: string, slug: string) {
  return `${BASE}/${prefix}/${slug}/`;
}

export default function Docs() {
  return (
    <List searchBarPlaceholder="Search Strudel docs...">
      {SECTIONS.map((section) => (
        <List.Section key={section.prefix} title={section.name}>
          {section.pages.map((page) => {
            const url = docUrl(section.prefix, page.slug);
            return (
              <List.Item
                key={`${section.prefix}/${page.slug}`}
                icon={section.icon}
                title={page.title}
                subtitle={page.description}
                accessories={[{ text: `/${section.prefix}/` }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open Docs" url={url} />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={url}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
