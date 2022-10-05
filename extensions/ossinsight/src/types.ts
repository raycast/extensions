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

export const languages = [
  "All",
  "JavaScript",
  "Java",
  "Python",
  "PHP",
  "C++",
  "C#",
  "Typescript",
  "Shell",
  "C",
  "Ruby",
  "Rust",
  "Go",
  "Kotlin",
  "HCL",
  "PowerShell",
  "CMake",
  "Groovy",
  "PLpgSQL",
  "TSQL",
  "Dart",
  "Swift",
  "HTML",
  "CSS",
  "Elixir",
  "Haskell",
  "Solidity",
  "Assembly",
  "R",
  "Scala",
  "Julia",
  "Lua",
  "Clojure",
  "Erlang",
  "Common Lisp",
  "Emacs Lisp",
  "OCaml",
  "MATLAB",
  "Objective-C",
  "Perl",
  "Fortran",
];
