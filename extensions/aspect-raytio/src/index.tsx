import { useEffect, useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";
import DimensionsDropdown from "./dimensions-dropdown";
import CreateCustomRatio from "./create-custom-ratio";
import AspectRatiosList from "./aspect-ratios-list";
import { defaultRatios } from "../lib/default-ratios";

export enum BasedDimensions {
  BASED_WIDTH = "Width",
  BASED_HEIGHT = "Height",
}

export enum Orientations {
  LANDSCAPE = "Landscape",
  PORTRAIT = "Portrait",
}

export type RatioType = {
  width: number;
  height: number;
};

const defaultSize = 1920;

export default function Command() {
  const [sizeValue, setSizeValue] = useState(defaultSize);
  const [basedDimension, setBasedDimension] = useState<BasedDimensions>(BasedDimensions.BASED_WIDTH);
  const [orientation, setOrientation] = useState<Orientations>(Orientations.LANDSCAPE);

  function handleDimensionChange(value: BasedDimensions) {
    setBasedDimension(value);
  }

  function handleOrientationChange() {
    if (orientation === Orientations.LANDSCAPE) {
      setOrientation(Orientations.PORTRAIT);
    } else {
      setOrientation(Orientations.LANDSCAPE);
    }
  }

  return (
    <List
      navigationTitle={`Raytio for ${orientation}`}
      searchBarPlaceholder="Width or Height"
      searchBarAccessory={<DimensionsDropdown value={basedDimension} handleDimensionChange={handleDimensionChange} />}
      onSearchTextChange={(text: string) => setSizeValue(Number(text))}
    >
      {!isNaN(Number(sizeValue)) ? (
        <>
          <AspectRatiosList
            title="Defaults"
            list={defaultRatios}
            sizeValue={sizeValue}
            basedDimension={basedDimension}
            orientation={orientation}
            handleOrientationChange={handleOrientationChange}
          />
          <List.Section title="Configuration">
            <List.Item
              title="Create New"
              subtitle="Create Custom Ratio"
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Create New"
                    target={
                      <CreateCustomRatio
                        totalCustomRatios={customRatios.length}
                        onCreate={(ar: RatioType) => {
                          setCustomRatios([...customRatios, ar]);
                        }}
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      ) : (
        <List.EmptyView title="Type only numbers with or without decimal values" description="e.g. 1920, 600.25" />
      )}
    </List>
  );
}
