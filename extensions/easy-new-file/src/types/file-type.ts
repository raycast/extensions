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
  icon: string;
  inputContent: boolean;
}

const iconFolder = "file-icons/";

export const documentFileTypes: FileType[] = [
  { name: "Text", extension: "txt", languageId: "plaintext", icon: iconFolder + "text.png", inputContent: true },
  { name: "RTF", extension: "rtf", languageId: "rtf", icon: iconFolder + "rtf.png", inputContent: false },
  { name: "Markdown", extension: "md", languageId: "markdown", icon: iconFolder + "markdown.png", inputContent: true },
  { name: "Word", extension: "docx", languageId: "docx", icon: iconFolder + "word.png", inputContent: false },
  { name: "PowerPoint", extension: "pptx", languageId: "pptx", icon: iconFolder + "ppt.png", inputContent: false },
  { name: "Excel", extension: "xlsx", languageId: "xlsx", icon: iconFolder + "excel.png", inputContent: false },
];

export const codeFileTypes: FileType[] = [
  { name: "Java", extension: "java", languageId: "java", icon: iconFolder + "java.svg", inputContent: true },
  {
    name: "Javascript",
    extension: "js",
    languageId: "javascript",
    icon: iconFolder + "javascript.svg",
    inputContent: true,
  },
  {
    name: "Typescript",
    extension: "ts",
    languageId: "typescript",
    icon: iconFolder + "typescript.svg",
    inputContent: true,
  },
  { name: "Json", extension: "json", languageId: "json", icon: iconFolder + "json.svg", inputContent: true },
  { name: "XML", extension: "xml", languageId: "xml", icon: iconFolder + "xml.svg", inputContent: true },
  { name: "CSS", extension: "css", languageId: "css", icon: iconFolder + "css.svg", inputContent: true },
  { name: "Html", extension: "html", languageId: "html", icon: iconFolder + "html.svg", inputContent: true },
  { name: "SVG", extension: "svg", languageId: "svg", icon: iconFolder + "svg.svg", inputContent: true },
];

export const scriptFileTypes: FileType[] = [
  {
    name: "Apple",
    extension: "applescript",
    languageId: "applescript",
    icon: iconFolder + "applescript.svg",
    inputContent: true,
  },
  {
    name: "Lua",
    extension: "lua",
    languageId: "lua",
    icon: iconFolder + "lua.svg",
    inputContent: true,
  },
  { name: "Perl", extension: "pl", languageId: "perl", icon: iconFolder + "perl.svg", inputContent: true },
  { name: "Python", extension: "py", languageId: "python", icon: iconFolder + "python.svg", inputContent: true },
  { name: "Ruby", extension: "rb", languageId: "ruby", icon: iconFolder + "ruby.svg", inputContent: true },
  { name: "Shell", extension: "sh", languageId: "shell", icon: iconFolder + "shell.svg", inputContent: true },
];
