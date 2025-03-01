import Init from "./setup/init";
import { convertersUtils } from "./utils/converters.utils";
import { errorUtils } from "./utils/errors.utils";

const Slowed = async () => {
  const converterName = "slowed";
  const { successToast } = convertersUtils.converters[converterName];

  try {
    await Init(converterName);
    await errorUtils.showToastSuccess({ title: successToast.title });
  } catch (error) {
    await errorUtils.showToastError(error);
  }
};

export default Slowed;
