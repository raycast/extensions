export interface TemplateType {
  path: string;
  name: string;
  extension: string;
  simpleContent: boolean;
}

export interface FileType {
  name: string;
  extension: string;
  languageId: string;
  icon: string;
  simpleContent: boolean;
}

export const documentFileTypes: FileType[] = [
  { name: "Text", extension: "txt", languageId: "plaintext", icon: "text.png", simpleContent: true },
  { name: "RTF", extension: "rtf", languageId: "rtf", icon: "rtf.png", simpleContent: false },
  { name: "Markdown", extension: "md", languageId: "markdown", icon: "markdown.png", simpleContent: true },
  { name: "Word", extension: "docx", languageId: "docx", icon: "docx.png", simpleContent: false },
  { name: "PowerPoint", extension: "pptx", languageId: "pptx", icon: "pptx.png", simpleContent: false },
  { name: "Excel", extension: "xlsx", languageId: "xlsx", icon: "xlsx.png", simpleContent: false },
];

export const codeFileTypes: FileType[] = [
  { name: "Java", extension: "java", languageId: "java", icon: "java.png", simpleContent: true },
  { name: "Javascript", extension: "js", languageId: "javascript", icon: "javascript.png", simpleContent: true },
  { name: "Typescript", extension: "ts", languageId: "typescript", icon: "typescript.png", simpleContent: true },
  { name: "Json", extension: "json", languageId: "json", icon: "json.png", simpleContent: true },
  { name: "XML", extension: "xml", languageId: "xml", icon: "xml.png", simpleContent: true },
  { name: "CSS", extension: "css", languageId: "css", icon: "css.png", simpleContent: true },
  { name: "Html", extension: "html", languageId: "html", icon: "html.png", simpleContent: true },
];

export const scriptFileTypes: FileType[] = [
  { name: "Apple", extension: "applescript", languageId: "applescript", icon: "applescript.png", simpleContent: true },
  { name: "Perl", extension: "pl", languageId: "perl", icon: "perl.png", simpleContent: true },
  { name: "Python", extension: "py", languageId: "python", icon: "python.png", simpleContent: true },
  { name: "Ruby", extension: "rb", languageId: "ruby", icon: "ruby.png", simpleContent: true },
  { name: "Shell", extension: "sh", languageId: "shell", icon: "shell.png", simpleContent: true },
];
