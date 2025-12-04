// Taken from https://raw.githubusercontent.com/thlorenz/brace/master/ext/modelist.js
const modes: Mode[] = [];

function getModeForPath(path: string) {
  let mode = modesByName.text;
  const fileName = path.split(/[/\\]/).pop();
  for (let i = 0; i < modes.length; i++) {
    if (modes[i].supportsFile(fileName ?? "")) {
      mode = modes[i];
      break;
    }
  }
  return mode;
}

class Mode {
  name: string;
  caption: string;
  mode: string;
  extensions: string;
  extRe: RegExp;

  constructor(name: string, caption: string, extensions: string) {
    this.name = name;
    this.caption = caption;
    this.mode = "ace/mode/" + name;
    this.extensions = extensions;
    let re;
    if (/\^/.test(extensions)) {
      re =
        extensions.replace(/\|(\^)?/g, function (a: string, b: string) {
          return "$|" + (b ? "^" : "^.*\\.");
        }) + "$";
    } else {
      re = "^.*\\.(" + extensions + ")$";
    }

    this.extRe = new RegExp(re, "gi");
  }

  public supportsFile(filename: string) {
    return filename.match(this.extRe);
  }
}

const supportedModes: Record<string, string[]> = {
  ABAP: ["abap"],
  ABC: ["abc"],
  ActionScript: ["as"],
  ADA: ["ada|adb"],
  Apache_Conf: ["^htaccess|^htgroups|^htpasswd|^conf|htaccess|htgroups|htpasswd"],
  AsciiDoc: ["asciidoc|adoc"],
  Assembly_x86: ["asm|a"],
  AutoHotKey: ["ahk"],
  BatchFile: ["bat|cmd"],
  Bro: ["bro"],
  C_Cpp: ["cpp|c|cc|cxx|h|hh|hpp|ino"],
  C9Search: ["c9search_results"],
  Cirru: ["cirru|cr"],
  Clojure: ["clj|cljs"],
  Cobol: ["CBL|COB"],
  coffee: ["coffee|cf|cson|^Cakefile"],
  ColdFusion: ["cfm"],
  CSharp: ["cs"],
  Csound_Document: ["csd"],
  Csound_Orchestra: ["orc"],
  Csound_Score: ["sco"],
  CSS: ["css"],
  Curly: ["curly"],
  D: ["d|di"],
  Dart: ["dart"],
  Diff: ["diff|patch"],
  Dockerfile: ["^Dockerfile"],
  Dot: ["dot"],
  Drools: ["drl"],
  Dummy: ["dummy"],
  DummySyntax: ["dummy"],
  Eiffel: ["e|ge"],
  EJS: ["ejs"],
  Elixir: ["ex|exs"],
  Elm: ["elm"],
  Erlang: ["erl|hrl"],
  Forth: ["frt|fs|ldr|fth|4th"],
  Fortran: ["f|f90"],
  FTL: ["ftl"],
  Gcode: ["gcode"],
  Gherkin: ["feature"],
  Gitignore: ["^.gitignore"],
  Glsl: ["glsl|frag|vert"],
  Gobstones: ["gbs"],
  golang: ["go"],
  GraphQLSchema: ["gql"],
  Groovy: ["groovy"],
  HAML: ["haml"],
  Handlebars: ["hbs|handlebars|tpl|mustache"],
  Haskell: ["hs"],
  Haskell_Cabal: ["cabal"],
  haXe: ["hx"],
  Hjson: ["hjson"],
  HTML: ["html|htm|xhtml|vue|we|wpy"],
  HTML_Elixir: ["eex|html.eex"],
  HTML_Ruby: ["erb|rhtml|html.erb"],
  INI: ["ini|conf|cfg|prefs"],
  Io: ["io"],
  Jack: ["jack"],
  Jade: ["jade|pug"],
  Java: ["java|cls|tgr"],
  JavaScript: ["js|jsm|jsx"],
  JSON: ["json"],
  JSONiq: ["jq"],
  JSP: ["jsp"],
  JSSM: ["jssm|jssm_state"],
  JSX: ["jsx"],
  Julia: ["jl"],
  Kotlin: ["kt|kts"],
  LaTeX: ["tex|latex|ltx|bib"],
  LESS: ["less"],
  Liquid: ["liquid"],
  Lisp: ["lisp"],
  LiveScript: ["ls"],
  LogiQL: ["logic|lql"],
  LSL: ["lsl"],
  Lua: ["lua"],
  LuaPage: ["lp"],
  Lucene: ["lucene"],
  Makefile: ["^Makefile|^GNUmakefile|^makefile|^OCamlMakefile|make"],
  Markdown: ["md|markdown"],
  Mask: ["mask"],
  MATLAB: ["matlab"],
  Maze: ["mz"],
  MEL: ["mel"],
  MUSHCode: ["mc|mush"],
  MySQL: ["mysql"],
  Nix: ["nix"],
  NSIS: ["nsi|nsh"],
  ObjectiveC: ["m|mm"],
  OCaml: ["ml|mli"],
  Pascal: ["pas|p"],
  Perl: ["pl|pm"],
  pgSQL: ["pgsql"],
  PHP: ["php|phtml|shtml|php3|php4|php5|phps|phpt|aw|ctp|module"],
  Pig: ["pig"],
  Powershell: ["ps1"],
  Praat: ["praat|praatscript|psc|proc"],
  Prolog: ["plg|prolog"],
  Properties: ["properties"],
  Protobuf: ["proto"],
  Python: ["py"],
  R: ["r"],
  Razor: ["cshtml|asp"],
  RDoc: ["Rd"],
  Red: ["red|reds"],
  RHTML: ["Rhtml"],
  RST: ["rst"],
  Ruby: ["rb|ru|gemspec|rake|^Guardfile|^Rakefile|^Gemfile"],
  Rust: ["rs"],
  SASS: ["sass"],
  SCAD: ["scad"],
  Scala: ["scala"],
  Scheme: ["scm|sm|rkt|oak|scheme"],
  SCSS: ["scss"],
  SH: ["sh|bash|^.bashrc"],
  SJS: ["sjs"],
  Smarty: ["smarty|tpl"],
  snippets: ["snippets"],
  Soy_Template: ["soy"],
  Space: ["space"],
  SQL: ["sql"],
  SQLServer: ["sqlserver"],
  Stylus: ["styl|stylus"],
  SVG: ["svg"],
  Swift: ["swift"],
  Tcl: ["tcl"],
  Tex: ["tex"],
  Text: ["txt"],
  Textile: ["textile"],
  Toml: ["toml"],
  TSX: ["tsx"],
  Twig: ["twig|swig"],
  Typescript: ["ts|typescript|str"],
  Vala: ["vala"],
  VBScript: ["vbs|vb"],
  Velocity: ["vm"],
  Verilog: ["v|vh|sv|svh"],
  VHDL: ["vhd|vhdl"],
  Wollok: ["wlk|wpgm|wtest"],
  XML: ["xml|rdf|rss|wsdl|xslt|atom|mathml|mml|xul|xbl|xaml"],
  XQuery: ["xq"],
  YAML: ["yaml|yml"],
  Django: ["html"],
};

const nameOverrides: Record<string, string> = {
  ObjectiveC: "Objective-C",
  CSharp: "C#",
  golang: "Go",
  C_Cpp: "C and C++",
  Csound_Document: "Csound Document",
  Csound_Orchestra: "Csound",
  Csound_Score: "Csound Score",
  coffee: "CoffeeScript",
  HTML_Ruby: "HTML (Ruby)",
  HTML_Elixir: "HTML (Elixir)",
  FTL: "FreeMarker",
};

const modesByName: Record<string, Mode> = {};
for (const name in supportedModes) {
  const data = supportedModes[name];
  const displayName = (nameOverrides[name] ?? name).replace(/_/g, " ");
  const filename = name.toLowerCase();
  const mode = new Mode(filename, displayName, data[0]);
  modesByName[filename] = mode;
  modes.push(mode);
}

export function getFiletype(filename: string) {
  return getModeForPath(filename).mode.split("/")[2];
}
