import Init from "./setup/init";
import { errorUtils } from "./utils/errors.utils";

const SlowedAndReverb = async () => {
  const converterName = "slowedAndReverb";

  try {
    await Init(converterName);
  } catch (error) {
    await errorUtils.showToastError(error);
  }
};

export default SlowedAndReverb;
