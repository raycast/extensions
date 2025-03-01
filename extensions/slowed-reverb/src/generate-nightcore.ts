import Init from "./setup/init";
import { errorUtils } from "./utils/errors.utils";

const Nightcore = async () => {
  const converterName = "nightcore";

  try {
    await Init(converterName);
  } catch (error) {
    await errorUtils.showToastError(error);
  }
};

export default Nightcore;
