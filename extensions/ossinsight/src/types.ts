export interface Repository {
  contributor_logins: string | null;
  description: string | null;
  forks: number;
  language: string | null;
  repo_id: number;
  repo_name: string;
  stars: number;
  pushes: number | null;
  pull_requests: number | null;
}

export const languages = {
  All: "All",
  JavaScript: "JavaScript",
  Java: "Java",
  Python: "Python",
  PHP: "PHP",
  "C++": "C++",
  "C#": "C%23",
  TypeScript: "TypeScript",
  Shell: "Shell",
  C: "C",
  Ruby: "Ruby",
  Rust: "Rust",
  Go: "Go",
  Kotlin: "Kotlin",
  HCL: "HCL",
  PowerShell: "PowerShell",
  CMake: "CMake",
  Groovy: "Groovy",
  PLpgSQL: "PLpgSQL",
  TSQL: "TSQL",
  Dart: "Dart",
  Swift: "Swift",
  HTML: "HTML",
  CSS: "CSS",
  Elixir: "Elixir",
  Haskell: "Haskell",
  Solidity: "Solidity",
  Assembly: "Assembly",
  R: "R",
  Scala: "Scala",
  Julia: "Julia",
  Lua: "Lua",
  Clojure: "Clojure",
  Erlang: "Erlang",
  "Common Lisp": "Common Lisp",
  "Emacs Lisp": "Emacs Lisp",
  OCaml: "OCaml",
  MATLAB: "MATLAB",
  "Objective-C": "Objective-C",
  Perl: "Perl",
  Fortran: "Fortran",
};
