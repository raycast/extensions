import Init from "./setup/init";
import { errorUtils } from "./utils/errors.utils";

const Slowed = async () => {
  const converterName = "slowed";

  try {
    await Init(converterName);
  } catch (error) {
    await errorUtils.showToastError(error);
  }
};

export default Slowed;
