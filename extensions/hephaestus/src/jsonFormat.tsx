import { formatJson } from "./jsonFormat/formatConvert";
import { InputJSON } from "./utils/inputJSONView";
import { Types } from "./utils/types";

export default function Command() {
  return (
    <InputJSON
      navTitle="JSON Format"
      actionTitle="Format"
      type={Types.JSON}
      onConvert={async (values) => await formatJson(values.jsonValue)}
    />
  );
}
