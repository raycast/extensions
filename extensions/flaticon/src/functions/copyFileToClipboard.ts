import { showToast, Toast, environment } from '@raycast/api';
import { runAppleScript } from 'run-applescript';
import { existsSync } from 'fs';

interface CopyFileToClipboardProps {
  url: string;
}

export const copyFileToClipboard = async ({ url }: CopyFileToClipboardProps) => {
  const toast = await showToast(Toast.Style.Animated, 'Downloading and copying image...');

  const name = pickName(url);
  const extension = pickExtension(url);
  const fixedPathName = `${getSupportPath()}${name}.${extension}`;

  try {
    const actualPath = fixedPathName;

    const command = !existsSync(actualPath)
      ? `set cmd to "curl -o " & q_temp_folder & " " & "${url}"
        do shell script cmd`
      : '';

    await runAppleScript(`
      set temp_folder to (POSIX path of "${actualPath}")
      set q_temp_folder to quoted form of temp_folder

      ${command}

      set x to alias (POSIX file temp_folder)
      set the clipboard to (read (contents of x) as JPEG picture)
    `);

    toast.style = Toast.Style.Success;
    toast.title = 'Image copied to the clipboard!';
  } catch (err) {
    console.error(err);

    toast.style = Toast.Style.Failure;
    toast.title = 'Something went wrong.';
    toast.message = 'Try with another image or check your internet connection.';
  }
};

export default copyFileToClipboard;

const pickName = (url: string) => {
  const name = url.split('/').pop();
  return name ? name.split('.').slice(0, -1).join('.') : 'image';
};

const pickExtension = (url: string) => {
  const extension = url.split('.').pop();
  return ['jpg', 'png'].find(ext => ext === extension) ? extension : 'jpg';
};

const getSupportPath = () => {
  const { supportPath } = environment;

  return `${supportPath}${supportPath.endsWith('/') ? '' : '/'}`;
};
