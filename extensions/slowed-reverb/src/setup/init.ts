import { Converters, convertersUtils } from "../utils/converters.utils";
import { errorUtils } from "../utils/errors.utils";
import { fileUtils } from "../utils/file.utils";
import { soxUtils } from "../utils/sox.utils";

const Init = async (currentConverter: keyof Converters) => {
  const { converters, converter } = convertersUtils;
  const { showToastSuccess, throwError, CONSTANTS } = errorUtils;
  const { getSelectedFilePaths } = fileUtils;
  const { command, fileNameSuffix, initialToast } = converters[currentConverter];
  const { isSoxInstalled } = soxUtils;
  const { successToast } = converters[currentConverter];

  if (!isSoxInstalled()) throwError(CONSTANTS.noSoxInstalled);
  await showToastSuccess({ title: initialToast.title, emoji: initialToast.emoji });

  const files = await getSelectedFilePaths();
  await Promise.all(files.map((inputPath) => converter(inputPath, command, fileNameSuffix)));

  await errorUtils.showToastSuccess({ title: successToast.title });
};

export default Init;
