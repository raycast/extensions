import dedent from "dedent-js";
import { SingleElement } from "./interfaces/element";

const NL = "  \n";

export const renderDetails = (item: SingleElement) => {
  return dedent(`
    ## ${item.name}

    > ${item.summary}

    Symbol: **${item.symbol}**

    Atomic Mass: **${item.atomic_mass}**

    Electron Configuration: **${item.electron_configuration_semantic}**

    Molar Heat: **${item.molar_heat}**

    Melting Point: **${item.melt}**
    
    Boiling Point: **${item.boil}**

    Phase: **${item.phase}**

    Density: **${item.density}**

    Period: **${item.period}**

    Category: **${item.category}**

    Electron Affinity: **${item.electron_affinity}**
    
    Appearance: **${item.appearance}**

    Discovered By: **${item.discovered_by}**
    `)
    .split("\n")
    .join(NL);
};
