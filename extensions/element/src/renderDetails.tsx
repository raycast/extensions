import dedent from "dedent-js";
import { SingleElement } from "./interfaces/element";
import { getPreferenceValues } from "@raycast/api";

const NL = "  \n";

export const renderDetails = (item: SingleElement) => {
  const { decimalPlaces } = getPreferenceValues<{ decimalPlaces: string }>();

  return dedent(`
    ## ${item.name}

    > ${item.summary}

    Symbol: **${item.symbol}**

    Atomic Number: **${item.number}**

    Atomic Mass: **${item.atomic_mass.toFixed(parseInt(decimalPlaces))}**

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
