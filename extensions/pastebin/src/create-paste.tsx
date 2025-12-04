import { Action, ActionPanel, Clipboard, Form, open, showHUD, Toast } from "@raycast/api";
import { CreateOptions, ExpireDate, Publicity } from "pastebin-api";
import { useToken } from "./utils/hooks";
import client from "./utils/client";
import { useRef, useState } from "react";

interface FormValues extends Omit<CreateOptions, "apiUserKey" | "publicity"> {
  publicity: string;
}

export default function Command() {
  const token = useToken();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string>();
  const [name, setName] = useState<string>();
  const { current: placeholder } = useRef(placeholderValues[Math.floor(Math.random() * placeholderValues.length)]);

  async function handleSubmit(values: FormValues) {
    setLoading(true);
    setCode("");
    setName("");

    const toast = new Toast({
      title: "Creating paste",
      style: Toast.Style.Animated,
    });

    toast.show();

    try {
      const url = await client.createPaste({
        ...values,
        publicity: parseInt(values.publicity),
        apiUserKey: token,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Paste created";
      toast.message = url.replace("https://", "");
      toast.primaryAction = {
        title: "Open URL",
        shortcut: { modifiers: ["cmd", "shift"], key: "o" },
        onAction: () => open(url),
      };
      toast.secondaryAction = {
        title: "Copy URL",
        shortcut: { modifiers: ["cmd", "shift"], key: "c" },
        onAction: () => {
          Clipboard.copy(url);
          toast.title = "Copied to Clipboard";
          toast.message = url.replace("https://", "");
        },
      };
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create paste";

      toast.primaryAction = {
        title: "Copy Error",
        shortcut: { modifiers: ["cmd", "shift"], key: "c" },
        onAction: () => {
          if (error instanceof Error) {
            Clipboard.copy(error.message);
          }
        },
      };

      setCode(values.code);
      setName(values.name);
    }

    setLoading(false);
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Paste" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="code" title="Code" value={code} onChange={setCode} placeholder={placeholder.code} />
      <Form.TextField id="name" title="Name" value={name} onChange={setName} placeholder={placeholder.name} />
      <Form.Dropdown id="expireDate" title="Expiration" storeValue>
        {expirationValues.map(({ title, value }) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="publicity" title="Exposure" storeValue>
        {publicityValues.map(({ title, value }) => (
          <Form.Dropdown.Item key={value} value={value.toString()} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="format" defaultValue={placeholder.format} title="Language">
        {formatsValues.map(({ title, value }) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

type DropdownValue<T> = {
  title: string;
  value: T;
};

const expirationValues: Array<DropdownValue<ExpireDate>> = [
  { title: "Never", value: ExpireDate.Never },
  { title: "10 Minutes", value: ExpireDate.TenMinutes },
  { title: "1 Hour", value: ExpireDate.OneHour },
  { title: "1 Day", value: ExpireDate.OneDay },
  { title: "1 Week", value: ExpireDate.OneWeek },
  { title: "2 Weeks", value: ExpireDate.TwoWeeks },
  { title: "1 Month", value: ExpireDate.OneMonth },
  { title: "6 Months", value: ExpireDate.SixMonths },
  { title: "1 Year", value: ExpireDate.OneYear },
];

const publicityValues: Array<DropdownValue<Publicity>> = [
  { title: "Private", value: Publicity.Private },
  { title: "Unlisted", value: Publicity.Unlisted },
  { title: "Public", value: Publicity.Public },
];

const placeholderValues = [
  {
    name: "Date Magic",
    format: "java",
    code: `public DateTime getTomorrowDate() {  
    Thread.Sleep(24*60*60*1000);  
    return DateTime.Now;`,
  },
  {
    name: "Life Attitude",
    format: "css",
    code: `.fear {
    display: none;
}`,
  },
  {
    name: "Classic Programmer Humor",
    format: "cpp",
    code: `long long ago; /* in a galaxy far far away */`,
  },
];

const formatsValues: Array<DropdownValue<string>> = [
  {
    title: "None",
    value: "",
  },
  {
    title: "HTML 5",
    value: "html5",
  },
  {
    title: "JavaScript",
    value: "javascript",
  },
  {
    title: "CSS",
    value: "css",
  },
  {
    title: "Java",
    value: "java",
  },
  {
    title: "Python",
    value: "python",
  },
  {
    title: "C",
    value: "c",
  },
  {
    title: "C#",
    value: "csharp",
  },
  {
    title: "C++",
    value: "cpp",
  },
  {
    title: "4CS",
    value: "4cs",
  },
  {
    title: "6502 ACME Cross Asse...",
    value: "6502acme",
  },
  {
    title: "6502 Kick Assembler",
    value: "6502kickass",
  },
  {
    title: "6502 TASM/64TASS",
    value: "6502tasm",
  },
  {
    title: "ABAP",
    value: "abap",
  },
  {
    title: "ActionScript",
    value: "actionscript",
  },
  {
    title: "ActionScript 3",
    value: "actionscript3",
  },
  {
    title: "Ada",
    value: "ada",
  },
  {
    title: "AIMMS",
    value: "aimms",
  },
  {
    title: "ALGOL 68",
    value: "algol68",
  },
  {
    title: "Apache Log",
    value: "apache",
  },
  {
    title: "AppleScript",
    value: "applescript",
  },
  {
    title: "APT Sources",
    value: "apt_sources",
  },
  {
    title: "Arduino",
    value: "arduino",
  },
  {
    title: "ARM",
    value: "arm",
  },
  {
    title: "ASM (NASM)",
    value: "asm",
  },
  {
    title: "ASP",
    value: "asp",
  },
  {
    title: "Asymptote",
    value: "asymptote",
  },
  {
    title: "autoconf",
    value: "autoconf",
  },
  {
    title: "Autohotkey",
    value: "autohotkey",
  },
  {
    title: "AutoIt",
    value: "autoit",
  },
  {
    title: "Avisynth",
    value: "avisynth",
  },
  {
    title: "Awk",
    value: "awk",
  },
  {
    title: "BASCOM AVR",
    value: "bascomavr",
  },
  {
    title: "Bash",
    value: "bash",
  },
  {
    title: "Basic4GL",
    value: "basic4gl",
  },
  {
    title: "Batch",
    value: "dos",
  },
  {
    title: "BibTeX",
    value: "bibtex",
  },
  {
    title: "Blitz3D",
    value: "b3d",
  },
  {
    title: "Blitz Basic",
    value: "blitzbasic",
  },
  {
    title: "BlitzMax",
    value: "bmx",
  },
  {
    title: "BNF",
    value: "bnf",
  },
  {
    title: "BOO",
    value: "boo",
  },
  {
    title: "BrainFuck",
    value: "bf",
  },
  {
    title: "C (WinAPI)",
    value: "c_winapi",
  },
  {
    title: "C++ (WinAPI)",
    value: "cpp-winapi",
  },
  {
    title: "C++ (with Qt extensi...",
    value: "cpp-qt",
  },
  {
    title: "C: Loadrunner",
    value: "c_loadrunner",
  },
  {
    title: "CAD DCL",
    value: "caddcl",
  },
  {
    title: "CAD Lisp",
    value: "cadlisp",
  },
  {
    title: "Ceylon",
    value: "ceylon",
  },
  {
    title: "CFDG",
    value: "cfdg",
  },
  {
    title: "C for Macs",
    value: "c_mac",
  },
  {
    title: "ChaiScript",
    value: "chaiscript",
  },
  {
    title: "Chapel",
    value: "chapel",
  },
  {
    title: "C Intermediate Langu...",
    value: "cil",
  },
  {
    title: "Clojure",
    value: "clojure",
  },
  {
    title: "Clone C",
    value: "klonec",
  },
  {
    title: "Clone C++",
    value: "klonecpp",
  },
  {
    title: "CMake",
    value: "cmake",
  },
  {
    title: "COBOL",
    value: "cobol",
  },
  {
    title: "CoffeeScript",
    value: "coffeescript",
  },
  {
    title: "ColdFusion",
    value: "cfm",
  },
  {
    title: "Cuesheet",
    value: "cuesheet",
  },
  {
    title: "D",
    value: "d",
  },
  {
    title: "Dart",
    value: "dart",
  },
  {
    title: "DCL",
    value: "dcl",
  },
  {
    title: "DCPU-16",
    value: "dcpu16",
  },
  {
    title: "DCS",
    value: "dcs",
  },
  {
    title: "Delphi",
    value: "delphi",
  },
  {
    title: "Delphi Prism (Oxygen...",
    value: "oxygene",
  },
  {
    title: "Diff",
    value: "diff",
  },
  {
    title: "DIV",
    value: "div",
  },
  {
    title: "DOT",
    value: "dot",
  },
  {
    title: "E",
    value: "e",
  },
  {
    title: "Easytrieve",
    value: "ezt",
  },
  {
    title: "ECMAScript",
    value: "ecmascript",
  },
  {
    title: "Eiffel",
    value: "eiffel",
  },
  {
    title: "Email",
    value: "email",
  },
  {
    title: "EPC",
    value: "epc",
  },
  {
    title: "Erlang",
    value: "erlang",
  },
  {
    title: "Euphoria",
    value: "euphoria",
  },
  {
    title: "F#",
    value: "fsharp",
  },
  {
    title: "Falcon",
    value: "falcon",
  },
  {
    title: "Filemaker",
    value: "filemaker",
  },
  {
    title: "FO Language",
    value: "fo",
  },
  {
    title: "Formula One",
    value: "f1",
  },
  {
    title: "Fortran",
    value: "fortran",
  },
  {
    title: "FreeBasic",
    value: "freebasic",
  },
  {
    title: "FreeSWITCH",
    value: "freeswitch",
  },
  {
    title: "GAMBAS",
    value: "gambas",
  },
  {
    title: "Game Maker",
    value: "gml",
  },
  {
    title: "GDB",
    value: "gdb",
  },
  {
    title: "GDScript",
    value: "gdscript",
  },
  {
    title: "Genero",
    value: "genero",
  },
  {
    title: "Genie",
    value: "genie",
  },
  {
    title: "GetText",
    value: "gettext",
  },
  {
    title: "Go",
    value: "go",
  },
  {
    title: "Godot GLSL",
    value: "godot-glsl",
  },
  {
    title: "Groovy",
    value: "groovy",
  },
  {
    title: "GwBasic",
    value: "gwbasic",
  },
  {
    title: "Haskell",
    value: "haskell",
  },
  {
    title: "Haxe",
    value: "haxe",
  },
  {
    title: "HicEst",
    value: "hicest",
  },
  {
    title: "HQ9 Plus",
    value: "hq9plus",
  },
  {
    title: "HTML",
    value: "html4strict",
  },
  {
    title: "Icon",
    value: "icon",
  },
  {
    title: "IDL",
    value: "idl",
  },
  {
    title: "INI file",
    value: "ini",
  },
  {
    title: "Inno Script",
    value: "inno",
  },
  {
    title: "INTERCAL",
    value: "intercal",
  },
  {
    title: "IO",
    value: "io",
  },
  {
    title: "ISPF Panel Definitio...",
    value: "ispfpanel",
  },
  {
    title: "J",
    value: "j",
  },
  {
    title: "Java 5",
    value: "java5",
  },
  {
    title: "JCL",
    value: "jcl",
  },
  {
    title: "jQuery",
    value: "jquery",
  },
  {
    title: "JSON",
    value: "json",
  },
  {
    title: "Julia",
    value: "julia",
  },
  {
    title: "KiXtart",
    value: "kixtart",
  },
  {
    title: "Kotlin",
    value: "kotlin",
  },
  {
    title: "KSP (Kontakt Script)",
    value: "ksp",
  },
  {
    title: "Latex",
    value: "latex",
  },
  {
    title: "LDIF",
    value: "ldif",
  },
  {
    title: "Liberty BASIC",
    value: "lb",
  },
  {
    title: "Linden Scripting",
    value: "lsl2",
  },
  {
    title: "Lisp",
    value: "lisp",
  },
  {
    title: "LLVM",
    value: "llvm",
  },
  {
    title: "Loco Basic",
    value: "locobasic",
  },
  {
    title: "Logtalk",
    value: "logtalk",
  },
  {
    title: "LOL Code",
    value: "lolcode",
  },
  {
    title: "Lotus Formulas",
    value: "lotusformulas",
  },
  {
    title: "Lotus Script",
    value: "lotusscript",
  },
  {
    title: "LScript",
    value: "lscript",
  },
  {
    title: "Lua",
    value: "lua",
  },
  {
    title: "M68000 Assembler",
    value: "m68k",
  },
  {
    title: "MagikSF",
    value: "magiksf",
  },
  {
    title: "Make",
    value: "make",
  },
  {
    title: "MapBasic",
    value: "mapbasic",
  },
  {
    title: "Markdown",
    value: "markdown",
  },
  {
    title: "MatLab",
    value: "matlab",
  },
  {
    title: "Mercury",
    value: "mercury",
  },
  {
    title: "MetaPost",
    value: "metapost",
  },
  {
    title: "mIRC",
    value: "mirc",
  },
  {
    title: "MIX Assembler",
    value: "mmix",
  },
  {
    title: "MK-61/52",
    value: "mk-61",
  },
  {
    title: "Modula 2",
    value: "modula2",
  },
  {
    title: "Modula 3",
    value: "modula3",
  },
  {
    title: "Motorola 68000 HiSof...",
    value: "68000devpac",
  },
  {
    title: "MPASM",
    value: "mpasm",
  },
  {
    title: "MXML",
    value: "mxml",
  },
  {
    title: "MySQL",
    value: "mysql",
  },
  {
    title: "Nagios",
    value: "nagios",
  },
  {
    title: "NetRexx",
    value: "netrexx",
  },
  {
    title: "newLISP",
    value: "newlisp",
  },
  {
    title: "Nginx",
    value: "nginx",
  },
  {
    title: "Nim",
    value: "nim",
  },
  {
    title: "NullSoft Installer",
    value: "nsis",
  },
  {
    title: "Oberon 2",
    value: "oberon2",
  },
  {
    title: "Objeck Programming L...",
    value: "objeck",
  },
  {
    title: "Objective C",
    value: "objc",
  },
  {
    title: "OCaml",
    value: "ocaml",
  },
  {
    title: "OCaml Brief",
    value: "ocaml-brief",
  },
  {
    title: "Octave",
    value: "octave",
  },
  {
    title: "OpenBSD PACKET FILTE...",
    value: "pf",
  },
  {
    title: "OpenGL Shading",
    value: "glsl",
  },
  {
    title: "Open Object Rexx",
    value: "oorexx",
  },
  {
    title: "Openoffice BASIC",
    value: "oobas",
  },
  {
    title: "Oracle 8",
    value: "oracle8",
  },
  {
    title: "Oracle 11",
    value: "oracle11",
  },
  {
    title: "Oz",
    value: "oz",
  },
  {
    title: "ParaSail",
    value: "parasail",
  },
  {
    title: "PARI/GP",
    value: "parigp",
  },
  {
    title: "Pascal",
    value: "pascal",
  },
  {
    title: "Pawn",
    value: "pawn",
  },
  {
    title: "PCRE",
    value: "pcre",
  },
  {
    title: "Per",
    value: "per",
  },
  {
    title: "Perl",
    value: "perl",
  },
  {
    title: "Perl 6",
    value: "perl6",
  },
  {
    title: "Phix",
    value: "phix",
  },
  {
    title: "PHP",
    value: "php",
  },
  {
    title: "PHP Brief",
    value: "php-brief",
  },
  {
    title: "Pic 16",
    value: "pic16",
  },
  {
    title: "Pike",
    value: "pike",
  },
  {
    title: "Pixel Bender",
    value: "pixelbender",
  },
  {
    title: "PL/I",
    value: "pli",
  },
  {
    title: "PL/SQL",
    value: "plsql",
  },
  {
    title: "PostgreSQL",
    value: "postgresql",
  },
  {
    title: "PostScript",
    value: "postscript",
  },
  {
    title: "POV-Ray",
    value: "povray",
  },
  {
    title: "PowerBuilder",
    value: "powerbuilder",
  },
  {
    title: "PowerShell",
    value: "powershell",
  },
  {
    title: "ProFTPd",
    value: "proftpd",
  },
  {
    title: "Progress",
    value: "progress",
  },
  {
    title: "Prolog",
    value: "prolog",
  },
  {
    title: "Properties",
    value: "properties",
  },
  {
    title: "ProvideX",
    value: "providex",
  },
  {
    title: "Puppet",
    value: "puppet",
  },
  {
    title: "PureBasic",
    value: "purebasic",
  },
  {
    title: "PyCon",
    value: "pycon",
  },
  {
    title: "Python for S60",
    value: "pys60",
  },
  {
    title: "q/kdb+",
    value: "q",
  },
  {
    title: "QBasic",
    value: "qbasic",
  },
  {
    title: "QML",
    value: "qml",
  },
  {
    title: "R",
    value: "rsplus",
  },
  {
    title: "Racket",
    value: "racket",
  },
  {
    title: "Rails",
    value: "rails",
  },
  {
    title: "RBScript",
    value: "rbs",
  },
  {
    title: "REBOL",
    value: "rebol",
  },
  {
    title: "REG",
    value: "reg",
  },
  {
    title: "Rexx",
    value: "rexx",
  },
  {
    title: "Robots",
    value: "robots",
  },
  {
    title: "Roff Manpage",
    value: "roff",
  },
  {
    title: "RPM Spec",
    value: "rpmspec",
  },
  {
    title: "Ruby",
    value: "ruby",
  },
  {
    title: "Ruby Gnuplot",
    value: "gnuplot",
  },
  {
    title: "Rust",
    value: "rust",
  },
  {
    title: "SAS",
    value: "sas",
  },
  {
    title: "Scala",
    value: "scala",
  },
  {
    title: "Scheme",
    value: "scheme",
  },
  {
    title: "Scilab",
    value: "scilab",
  },
  {
    title: "SCL",
    value: "scl",
  },
  {
    title: "SdlBasic",
    value: "sdlbasic",
  },
  {
    title: "Smalltalk",
    value: "smalltalk",
  },
  {
    title: "Smarty",
    value: "smarty",
  },
  {
    title: "SPARK",
    value: "spark",
  },
  {
    title: "SPARQL",
    value: "sparql",
  },
  {
    title: "SQF",
    value: "sqf",
  },
  {
    title: "SQL",
    value: "sql",
  },
  {
    title: "SSH Config",
    value: "sshconfig",
  },
  {
    title: "StandardML",
    value: "standardml",
  },
  {
    title: "StoneScript",
    value: "stonescript",
  },
  {
    title: "SuperCollider",
    value: "sclang",
  },
  {
    title: "Swift",
    value: "swift",
  },
  {
    title: "SystemVerilog",
    value: "systemverilog",
  },
  {
    title: "T-SQL",
    value: "tsql",
  },
  {
    title: "TCL",
    value: "tcl",
  },
  {
    title: "Tera Term",
    value: "teraterm",
  },
  {
    title: "TeXgraph",
    value: "texgraph",
  },
  {
    title: "thinBasic",
    value: "thinbasic",
  },
  {
    title: "TypeScript",
    value: "typescript",
  },
  {
    title: "TypoScript",
    value: "typoscript",
  },
  {
    title: "Unicon",
    value: "unicon",
  },
  {
    title: "UnrealScript",
    value: "uscript",
  },
  {
    title: "UPC",
    value: "upc",
  },
  {
    title: "Urbi",
    value: "urbi",
  },
  {
    title: "Vala",
    value: "vala",
  },
  {
    title: "VB.NET",
    value: "vbnet",
  },
  {
    title: "VBScript",
    value: "vbscript",
  },
  {
    title: "Vedit",
    value: "vedit",
  },
  {
    title: "VeriLog",
    value: "verilog",
  },
  {
    title: "VHDL",
    value: "vhdl",
  },
  {
    title: "VIM",
    value: "vim",
  },
  {
    title: "VisualBasic",
    value: "vb",
  },
  {
    title: "VisualFoxPro",
    value: "visualfoxpro",
  },
  {
    title: "Visual Pro Log",
    value: "visualprolog",
  },
  {
    title: "WhiteSpace",
    value: "whitespace",
  },
  {
    title: "WHOIS",
    value: "whois",
  },
  {
    title: "Winbatch",
    value: "winbatch",
  },
  {
    title: "XBasic",
    value: "xbasic",
  },
  {
    title: "XML",
    value: "xml",
  },
  {
    title: "Xojo",
    value: "xojo",
  },
  {
    title: "Xorg Config",
    value: "xorg_conf",
  },
  {
    title: "XPP",
    value: "xpp",
  },
  {
    title: "YAML",
    value: "yaml",
  },
  {
    title: "YARA",
    value: "yara",
  },
  {
    title: "Z80 Assembler",
    value: "z80",
  },
  {
    title: "ZXBasic",
    value: "zxbasic",
  },
];
