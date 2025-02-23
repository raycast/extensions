import { Converters, convertersUtils } from '../utils/converters.utils'
import { errorUtils } from '../utils/errors.utils'
import { fileUtils } from '../utils/file.utils'
import { soxUtils } from '../utils/sox.utils'

const Init = async (currentConverter: keyof Converters) => {
  const { converters, converter } = convertersUtils
  const { showToastError, showToastSuccess, throwError, CONSTANTS } = errorUtils
  const { getSelectedFilePaths } = fileUtils
  const { command, fileNameSuffix, initialToast, successToast } = converters[currentConverter]
  const { isSoxInstalled } = soxUtils

  try {
    if (!isSoxInstalled()) throwError(CONSTANTS.noSoxInstalled)
    await showToastSuccess({ title: initialToast.title, emoji: initialToast.emoji })

    const files = await getSelectedFilePaths()
    files.forEach((inputPath) => converter(inputPath, command, fileNameSuffix))

    await showToastSuccess({ title: successToast.title })
  } catch (error) {
    await showToastError(error)
  }
}

export default Init
