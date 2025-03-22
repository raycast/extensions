import { useEffect, useState } from "react";
import { List, LaunchProps, Form } from "@raycast/api";
import DimensionsDropdown from "./dimensions-dropdown";
import AspectRatiosList from "./aspect-ratios-list";
import { useAllCustomRatios } from "../hooks/useCustomRatios";
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
  key?: string;
  width: number;
  height: number;
};

const defaultSize = 1920;

export default function Command(props: LaunchProps<{ arguments: RatioType }>) {
  const { width, height } = props.arguments;
  const [sizeValue, setSizeValue] = useState(width || height || defaultSize);
  const [orientation, setOrientation] = useState<Orientations>(Orientations.LANDSCAPE);
  const [customRatios, setCustomRatios] = useState<RatioType[]>([]);
  const [basedDimension, setBasedDimension] = useState<BasedDimensions>(
    height ? BasedDimensions.BASED_HEIGHT : BasedDimensions.BASED_WIDTH,
  );

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

  async function fetchCustomRatios() {
    const customAspectRatios = await useAllCustomRatios();
    setCustomRatios(customAspectRatios);
  }

  useEffect(() => {
    fetchCustomRatios();
  }, []);

  useEffect(() => {
    if (sizeValue === 0) {
      setSizeValue(defaultSize);
    }
  }, [sizeValue]);

  return (
    <>
      <Form>
        <Form.TextField id="width" title="Width" />
        <Form.TextField id="height" title="Height" />
      </Form>
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
              totalCustomRatios={customRatios.length}
              handleOrientationChange={handleOrientationChange}
              handleNewCustomRatio={(ar: RatioType) => {
                setCustomRatios([...customRatios, ar]);
              }}
              handleDeleteAll={() => {
                if (customRatios.length > 0) setCustomRatios([]);
              }}
            />
            <AspectRatiosList
              title="Custom"
              list={customRatios}
              sizeValue={sizeValue}
              basedDimension={basedDimension}
              orientation={orientation}
              totalCustomRatios={customRatios.length}
              handleOrientationChange={handleOrientationChange}
              handleNewCustomRatio={(ar: RatioType) => {
                setCustomRatios([...customRatios, ar]);
              }}
              handleDeleteItem={(id: string) => {
                setCustomRatios(customRatios.filter((ratio: RatioType) => ratio.key !== id));
              }}
              handleDeleteAll={() => {
                if (customRatios.length > 0) setCustomRatios([]);
              }}
            />
          </>
        ) : (
          <List.EmptyView title="Type only numbers with or without decimal values" description="e.g. 1920, 600.25" />
        )}
      </List>
    </>
  );
}
