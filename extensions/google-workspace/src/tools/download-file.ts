import { getFileById, getFileIdFromLink } from "../api/getFiles";
import { withGoogleAuth } from "../components/withGoogleAuth";
import { downloadToDownloads, getDownloadOptions } from "../helpers/files";

type Input = {
  /**
   * The ID of the file or folder to download, or a Google Drive, Docs, Sheets or Slides link to it.
   * Use the `search-files` tool first if you only know the name of the file.
   */
  file: string;

  /**
   * The format to export Google-native files to. Ignored for other files, which are downloaded as is.
   *
   * Available options:
   * - `md`: Markdown (Google Docs only, default for Google Docs)
   * - `docx`: Word (Google Docs only)
   * - `xlsx`: Excel (Google Sheets only)
   * - `pptx`: PowerPoint (Google Slides only)
   * - `png`: PNG (Google Drawings only)
   *
   * Folders are always downloaded as a ZIP archive.
   */
  format?: "md" | "docx" | "xlsx" | "pptx" | "png";
};

/**
 * Downloads a file or folder from Google Drive to the Downloads folder and returns the path of the downloaded file.
 * For folders, `skipped` lists the files inside that couldn't be exported.
 */
export default withGoogleAuth(async function (input: Input) {
  const file = await getFileById(getFileIdFromLink(input.file) ?? input.file);

  const options = getDownloadOptions(file);
  if (options.length === 0) {
    throw new Error(`"${file.name}" can't be downloaded`);
  }

  const option = input.format ? options.find(({ format }) => format?.extension === input.format) : options[0];
  if (!option) {
    throw new Error(`"${file.name}" can't be downloaded as ${input.format}`);
  }

  return { name: file.name, ...(await downloadToDownloads(file, option.format)) };
});
