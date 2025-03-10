import { Action, ActionPanel, Grid, Icon, launchCommand, LaunchType } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { ReactElement, useState } from "react";
import { elements } from "./elements";

const table = [
  ["H", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "He"],
  ["Li", "Be", "", "", "", "", "", "", "", "", "", "B", "C", "N", "O", "F", "Ne"],
  ["Na", "Mg", "", "", "", "", "", "", "", "", "", "Al", "Si", "P", "S", "Cl", "Ar"],
  ["K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr"],
  ["Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe"],
  ["Cs", "Ba", "", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn"],
  ["Fr", "Ra", "", "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og"],
  ["", "", "", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu"],
  ["", "", "", "Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr"],
];

function ColumnsActions({
  columnStart,
  setColumnStart,
}: {
  columnStart: number;
  setColumnStart: (value: number) => void;
}) {
  return (
    <>
      {columnStart > 0 && (
        <Action
          title="Move Left"
          icon={Icon.ArrowLeft}
          shortcut={{ key: "arrowLeft", modifiers: ["cmd"] }}
          onAction={() => {
            setColumnStart(columnStart - 1);
          }}
        />
      )}
      {columnStart < 9 && (
        <Action
          title="Move Right"
          icon={Icon.ArrowRight}
          shortcut={{ key: "arrowRight", modifiers: ["cmd"] }}
          onAction={() => {
            setColumnStart(columnStart + 1);
          }}
        />
      )}
    </>
  );
}

export default function Command() {
  const [columnStart, setColumnStart] = useCachedState("columnStart", 0);
  const columns = 8;

  const [isSearching, setIsSearching] = useState(false);

  const gridItems: ReactElement[] = [];
  for (let i = 0; i < table.length; i++) {
    const jInit = isSearching ? 0 : columnStart;
    const jEnd = isSearching ? table[i].length : columns + columnStart;

    for (let j = jInit; j < jEnd; j++) {
      const symbol = table[i][j];

      if (symbol) {
        const element = elements[symbol];

        gridItems.push(
          <Grid.Item
            key={symbol}
            content={`elements/${symbol}.svg`}
            keywords={Object.values(element)}
            actions={
              <ActionPanel>
                <Action
                  title="More Info"
                  icon={Icon.Info}
                  onAction={() => {
                    launchCommand({
                      ownerOrAuthorName: "Aayush9029",
                      extensionName: "element",
                      name: "index",
                      type: LaunchType.UserInitiated,
                      fallbackText: element.Name,
                    });
                  }}
                />
                <ColumnsActions columnStart={columnStart} setColumnStart={setColumnStart} />
              </ActionPanel>
            }
          />,
        );
      } else if (!isSearching) {
        gridItems.push(
          <Grid.Item
            key={`${i}-${j}`}
            content={""}
            actions={
              <ActionPanel>
                <ColumnsActions columnStart={columnStart} setColumnStart={setColumnStart} />
              </ActionPanel>
            }
          />,
        );
      }
    }
  }

  return (
    <Grid
      columns={columns}
      filtering
      onSearchTextChange={(searchText) => setIsSearching(!!searchText.length)}
      searchBarAccessory={
        isSearching ? null : (
          <Grid.Dropdown
            tooltip="Table part"
            value={columnStart.toString()}
            onChange={(value) => setColumnStart(parseInt(value))}
          >
            <Grid.Dropdown.Item title="Left" value={"0"} icon={Icon.AlignLeft} />
            <Grid.Dropdown.Item title="Middle" value={"4"} icon={Icon.AlignCentre} keywords={["center", "centre"]} />
            <Grid.Dropdown.Item title="Right" value={"9"} icon={Icon.AlignRight} />
            {columnStart !== 0 && columnStart !== 4 && columnStart !== 9 && (
              <Grid.Dropdown.Item title="Custom" value={columnStart.toString()} />
            )}
          </Grid.Dropdown>
        )
      }
    >
      {gridItems}
    </Grid>
  );
}
