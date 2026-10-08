export interface TemplateType {
  path: string;
  name: string;
  extension: string;
  inputContent: boolean;
}

export interface FileType {
  name: string;
  extension: string;
  languageId: string;
  keywords: string[];
  icon: string;
  inputContent: boolean;
}

const iconFolder = "file-icons/";

export const documentFileTypes: FileType[] = [
  {
    name: "Text",
    extension: "txt",
    languageId: "plaintext",
    keywords: ["plaintext"],
    icon: iconFolder + "text.png",
    inputContent: true,
  },
  { name: "RTF", extension: "rtf", languageId: "rtf", keywords: [], icon: iconFolder + "rtf.png", inputContent: false },
  {
    name: "Markdown",
    extension: "md",
    languageId: "markdown",
    keywords: [],
    icon: iconFolder + "markdown.png",
    inputContent: true,
  },
  {
    name: "Word",
    extension: "docx",
    languageId: "docx",
    keywords: ["docx"],
    icon: iconFolder + "word.png",
    inputContent: false,
  },
  {
    name: "PowerPoint",
    extension: "pptx",
    languageId: "pptx",
    keywords: ["pptx"],
    icon: iconFolder + "ppt.png",
    inputContent: false,
  },
  {
    name: "Excel",
    extension: "xlsx",
    languageId: "xlsx",
    keywords: ["xlsx"],
    icon: iconFolder + "excel.png",
    inputContent: false,
  },
];

export const codeFileTypes: FileType[] = [
  {
    name: "Java",
    extension: "java",
    languageId: "java",
    keywords: [],
    icon: iconFolder + "java.svg",
    inputContent: true,
  },
  {
    name: "Javascript",
    extension: "js",
    languageId: "javascript",
    keywords: [],
    icon: iconFolder + "javascript.svg",
    inputContent: true,
  },
  {
    name: "Typescript",
    extension: "ts",
    languageId: "typescript",
    keywords: [],
    icon: iconFolder + "typescript.svg",
    inputContent: true,
  },
  {
    name: "JSON",
    extension: "json",
    languageId: "json",
    keywords: [],
    icon: iconFolder + "json.svg",
    inputContent: true,
  },
  { name: "XML", extension: "xml", languageId: "xml", keywords: [], icon: iconFolder + "xml.svg", inputContent: true },
  { name: "CSS", extension: "css", languageId: "css", keywords: [], icon: iconFolder + "css.svg", inputContent: true },
  {
    name: "Html",
    extension: "html",
    languageId: "html",
    keywords: [],
    icon: iconFolder + "html.svg",
    inputContent: true,
  },
  { name: "SVG", extension: "svg", languageId: "svg", keywords: [], icon: iconFolder + "svg.svg", inputContent: true },
];

export const scriptFileTypes: FileType[] = [
  {
    name: "Apple",
    extension: "applescript",
    languageId: "applescript",
    keywords: ["script"],
    icon: iconFolder + "applescript.svg",
    inputContent: true,
  },
  {
    name: "Groovy",
    extension: "groovy",
    languageId: "groovy",
    keywords: [],
    icon: iconFolder + "groovy.svg",
    inputContent: true,
  },
  {
    name: "Lua",
    extension: "lua",
    languageId: "lua",
    keywords: [],
    icon: iconFolder + "lua.svg",
    inputContent: true,
  },
  {
    name: "Perl",
    extension: "pl",
    languageId: "perl",
    keywords: [],
    icon: iconFolder + "perl.svg",
    inputContent: true,
  },
  { name: "PHP", extension: "php", languageId: "php", keywords: [], icon: iconFolder + "php.svg", inputContent: true },
  {
    name: "Python",
    extension: "py",
    languageId: "python",
    keywords: [],
    icon: iconFolder + "python.svg",
    inputContent: true,
  },
  {
    name: "Ruby",
    extension: "rb",
    languageId: "ruby",
    keywords: [],
    icon: iconFolder + "ruby.svg",
    inputContent: true,
  },
  {
    name: "Shell",
    extension: "sh",
    languageId: "shell",
    keywords: ["bash"],
    icon: iconFolder + "shell.svg",
    inputContent: true,
  },
];

export const allFileTypes = documentFileTypes.concat(codeFileTypes).concat(scriptFileTypes);
