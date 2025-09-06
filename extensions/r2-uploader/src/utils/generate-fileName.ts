import path from "path";
import dayjs from "dayjs";

export function generateFileName(originalPath: string, formatString: string, customExtension?: string): string {
  const ext = customExtension || path.extname(originalPath).toLowerCase();
  const basename = path.basename(originalPath, path.extname(originalPath));

  if (!formatString) {
    if (customExtension) {
      return basename + customExtension;
    }
    return path.basename(originalPath);
  }

  const now = new Date();

  let formattedName = formatString
    .replace(/{name}/g, basename)
    .replace(/{ext}/g, ext.length > 0 ? ext.substring(1) : "")
    .replace(/{year}/g, dayjs(now).format("yyyy"))
    .replace(/{month}/g, dayjs(now).format("MM"))
    .replace(/{day}/g, dayjs(now).format("dd"))
    .replace(/{hours}/g, dayjs(now).format("HH"))
    .replace(/{minutes}/g, dayjs(now).format("mm"))
    .replace(/{seconds}/g, dayjs(now).format("ss"));

  if (!path.extname(formattedName)) {
    formattedName += ext;
  } else if (path.extname(formattedName) !== ext) {
    formattedName = path.basename(formattedName, path.extname(formattedName)) + ext;
  }

  return formattedName;
}
