import dns from 'node:dns';
import fs from 'node:fs';

import { getSelectedFinderItems } from '@raycast/api';

/**
 * Returns the name and path of a selected file in Finder.
 * @async
 * @returns {Promise<{ name: string, path: string }>} A Promise that resolves to an object containing the name and path of the selected file.
 * @throws {Error} Throws an error if no file is selected, multiple files are selected, or the selected item is not a file.
 */
export const getSelectedFile = async () => {
  const selectedItems = await getSelectedFinderItems();

  if (selectedItems.length === 0) {
    throw Error('No file selected.');
  } else if (selectedItems.length > 1) {
    throw Error('Uploading multiple files is not supported.');
  }

  const { path } = selectedItems[0];

  if (!fs.lstatSync(path).isFile()) {
    throw Error('Selected item is not a file.');
  }

  const pathTokens = path.split('/');
  const name = pathTokens[pathTokens.length - 1];

  return { name, path };
};

/**
 * Checks the internet connection by performing a DNS lookup on google.com.
 * @async
 * @returns {Promise<boolean>} A Promise that resolves to `true` if the internet connection is available.
 * @throws {Error} Throws an error if no internet connection is available.
 */
export const checkInternet = async () => {
  const result = await dns.promises
    .lookup('google.com')
    .then(() => true)
    .catch(() => {
      throw Error('Check your internet connection');
    });

  return result;
};
