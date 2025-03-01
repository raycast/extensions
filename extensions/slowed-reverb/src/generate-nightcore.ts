import Init from "./setup/init";
import { convertersUtils } from "./utils/converters.utils";
import { errorUtils } from "./utils/errors.utils";

const Nightcore = async () => {
  const converterName = "nightcore";
  const { successToast } = convertersUtils.converters[converterName];

  try {
    await Init(converterName);
    await errorUtils.showToastSuccess({ title: successToast.title });
  } catch (error) {
    await errorUtils.showToastError(error);
  }
};

export default Nightcore;
