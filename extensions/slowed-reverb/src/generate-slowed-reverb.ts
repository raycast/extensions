import Init from './setup/init'
import { convertersUtils } from './utils/converters.utils'
import { errorUtils } from './utils/errors.utils'

const SlowedAndReverb = async () => {
  const converterName = 'slowedAndReverb'
  const { successToast } = convertersUtils.converters[converterName]

  await Init(converterName)
  await errorUtils.showToastSuccess({ title: successToast.title })
}

export default SlowedAndReverb
