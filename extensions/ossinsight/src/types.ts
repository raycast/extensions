export interface Repository {
  contributor_logins: string;
  description: string;
  forks: string;
  primary_language: string;
  repo_id: string;
  repo_name: string;
  stars: string;
  pushes: string;
  pull_requests: string;
}

export const languages = {
  All: "All",
  JavaScript: "JavaScript",
  Java: "Java",
  Python: "Python",
  PHP: "PHP",
  "C++": "C++",
  "C#": "C#",
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
