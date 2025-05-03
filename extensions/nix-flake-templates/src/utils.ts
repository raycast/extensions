import { spawnSync } from "node:child_process";

const templateToLang: Record<string, string> = {
  bun: "Bun",
  "c-cpp": "C/C++",
  clojure: "Clojure",
  csharp: "C#",
  cue: "Cue",
  dhall: "Dhall",
  elixir: "Elixir",
  elm: "Elm",
  empty: "Empty (change at will)",
  gleam: "Gleam",
  go: "Go",
  hashi: "Hashicorp tools",
  haskell: "Haskell",
  haxe: "Haxe",
  java: "Java",
  jupyter: "Jupyter",
  kotlin: "Kotlin",
  latex: "LaTeX",
  nickel: "Nickel",
  nim: "Nim",
  nix: "Nix",
  node: "Node.js",
  ocaml: "OCaml",
  opa: "Open Policy Agent",
  php: "PHP",
  platformio: "PlatformIO",
  protobuf: "Protobuf",
  pulumi: "Pulumi",
  purescript: "Purescript",
  python: "Python",
  r: "R",
  ruby: "Ruby",
  rust: "Rust",
  "rust-toolchain": "Rust from toolchain file",
  scala: "Scala",
  shell: "Shell",
  "swi-prolog": "SWI-prolog",
  swift: "Swift",
  vlang: "Vlang",
  zig: "Zig",
};

export function capitalizeFirstLetter(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatTitle(template: string): string {
  return templateToLang[template] ?? capitalizeFirstLetter(template);
}

export function spawn(command: string, args: ReadonlyArray<string>) {
  return new Promise((resolve, reject) => {
    const process = spawnSync(command, args);
    if (process.error !== undefined) {
      reject(process.error);
    } else {
      resolve(process.stdout.toString());
    }
  });
}
