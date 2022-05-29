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

export const documentFileTypes: FileType[] = [
  { name: "Text", extension: "txt", languageId: "plaintext", icon: "text.png", inputContent: true },
  { name: "RTF", extension: "rtf", languageId: "rtf", icon: "rtf.png", inputContent: false },
  { name: "Markdown", extension: "md", languageId: "markdown", icon: "markdown.png", inputContent: true },
  { name: "Word", extension: "docx", languageId: "docx", icon: "docx.png", inputContent: false },
  { name: "PowerPoint", extension: "pptx", languageId: "pptx", icon: "pptx.png", inputContent: false },
  { name: "Excel", extension: "xlsx", languageId: "xlsx", icon: "xlsx.png", inputContent: false },
];

export const codeFileTypes: FileType[] = [
  { name: "Java", extension: "java", languageId: "java", icon: "java.png", inputContent: true },
  { name: "Javascript", extension: "js", languageId: "javascript", icon: "javascript.png", inputContent: true },
  { name: "Typescript", extension: "ts", languageId: "typescript", icon: "typescript.png", inputContent: true },
  { name: "Json", extension: "json", languageId: "json", icon: "json.png", inputContent: true },
  { name: "XML", extension: "xml", languageId: "xml", icon: "xml.png", inputContent: true },
  { name: "CSS", extension: "css", languageId: "css", icon: "css.png", inputContent: true },
  { name: "Html", extension: "html", languageId: "html", icon: "html.png", inputContent: true },
];

export const scriptFileTypes: FileType[] = [
  { name: "Apple", extension: "applescript", languageId: "applescript", icon: "applescript.png", inputContent: true },
  { name: "Perl", extension: "pl", languageId: "perl", icon: "perl.png", inputContent: true },
  { name: "Python", extension: "py", languageId: "python", icon: "python.png", inputContent: true },
  { name: "Ruby", extension: "rb", languageId: "ruby", icon: "ruby.png", inputContent: true },
  { name: "Shell", extension: "sh", languageId: "shell", icon: "shell.png", inputContent: true },
];
