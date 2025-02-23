import Init from './setup/init'
import { convertersUtils } from './utils/converters.utils'
import { errorUtils } from './utils/errors.utils'

const Reverb = async () => {
  const converterName = 'reverb'
  const { successToast } = convertersUtils.converters[converterName]

  await Init(converterName)
  await errorUtils.showToastSuccess({ title: successToast.title })
}

export default Reverb
