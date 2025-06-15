import dedent from "dedent-js";
import { ItchModel } from "../interface/itchModel";

const NL = "  \n";

export const renderDetails = (item: ItchModel) => {
  return dedent(`
      ## ${item.plainTitle}

      > ${item.description}

      **Created at:** ${item.createDate}

      **Platforms:** \`${item.platforms.join("` `")}\`

      **Price:** ${item.price} ${item.currency}

    `)
    .split("\n")
    .join(NL);
};
