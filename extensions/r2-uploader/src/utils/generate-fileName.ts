import path from "path";
import dayjs from "dayjs";

export function renderTemplateTokens(template: string, originalPath: string): string {
  const ext = path.extname(originalPath).toLowerCase();
  const basename = path.basename(originalPath, ext);
  const now = new Date();

  return template
    .replace(/{name}/g, basename)
    .replace(/{ext}/g, ext ? ext.substring(1) : "")
    .replace(/{year}/g, dayjs(now).format("YYYY"))
    .replace(/{month}/g, dayjs(now).format("MM"))
    .replace(/{day}/g, dayjs(now).format("DD"))
    .replace(/{hours}/g, dayjs(now).format("HH"))
    .replace(/{minutes}/g, dayjs(now).format("mm"))
    .replace(/{seconds}/g, dayjs(now).format("ss"));
}

export async function generateFileName(
  originalPath: string,
  formatString: string,
  customExtension?: string,
): Promise<string> {
  const ext = customExtension || path.extname(originalPath).toLowerCase();
  const basename = path.basename(originalPath, path.extname(originalPath));

  if (!formatString) {
    if (customExtension) {
      return basename + customExtension;
    }
    return path.basename(originalPath);
  }

  let formattedName = renderTemplateTokens(formatString, originalPath);

  if (!path.extname(formattedName)) {
    formattedName += ext;
  } else if (path.extname(formattedName) !== ext) {
    formattedName = path.basename(formattedName, path.extname(formattedName)) + ext;
  }

  return formattedName;
}
