import { File } from './service';

function getFileName(path: string): string {
  const tokens = path.split('.');
  return tokens[0];
}

function getFileExtension(path: string): string {
  const tokens = path.split('.');
  return tokens[1];
}

function getSheets(files: File[]): string[] {
  return files
    .filter((file) => {
      const isDir = file.type === 'tree';
      const isMarkdown = getFileExtension(file.path) === 'md';
      const adminFiles = ['CONTRIBUTING', 'README', 'index', 'index@2016'];
      const isAdminFile = adminFiles.includes(getFileName(file.path));
      return !isDir && isMarkdown && !isAdminFile;
    })
    .map((file) => getFileName(file.path));
}

function stripFrontmatter(markdown: string): string {
  const frontmatterStart = markdown.indexOf('---');
  const frontmatterEnd = markdown.indexOf('---', frontmatterStart + 1);
  return markdown.substring(frontmatterEnd + 3);
}

/*
  Removes Jekyll templating tags

  Tag examples:
  * {: .-one-column}
  * {: .-two-column}
  * {: .-three-column}
  * {: .-intro}
  * {: .-prime}
  * {: .-setup}

  * {: data-line="1"}
  * {: data-line="2"}
  * {: data-line="3, 8, 16, 21, 28, 34, 39"}

  * {%raw%}
  * {%endraw%}
*/
function stripTemplateTags(markdown: string): string {
  // TODO
  return markdown;
}

export { getSheets, stripFrontmatter, stripTemplateTags };
