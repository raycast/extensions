import Init from "./setup/init";
import { errorUtils } from "./utils/errors.utils";

const Reverb = async () => {
  const converterName = "reverb";

  try {
    await Init(converterName);
  } catch (error) {
    await errorUtils.showToastError(error);
  }
};

export default Reverb;
