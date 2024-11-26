import { getSelectedText, useNavigation } from "@raycast/api";
import { formatJS } from "./utils";
import { FormattedJsonDetail } from "./formattedJsonDetail";
import { useEffect } from "react";

export default function Command() {
  const { push } = useNavigation();

  useEffect(() => {
    async function format() {
      const output = await formatJS(await getSelectedText());
      if (output) {
        push(<FormattedJsonDetail json={output} />);
      }
    }
    format();
  }, [push]);

  return null;
}
