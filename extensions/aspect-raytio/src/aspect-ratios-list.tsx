import { List } from "@raycast/api";
import { BasedDimensions, Orientations, RatioType } from ".";
import { getMinMax } from "../lib/utils";
import ActionOptions from "./action-options";

export default function AspectRatiosList(props: {
  title: string;
  list: RatioType[];
  sizeValue: number;
  basedDimension: BasedDimensions;
  orientation: Orientations;
  totalCustomRatios: number;
  handleOrientationChange: () => void;
  handleNewCustomRatio?: (ar: RatioType) => void;
  handleDeleteItem?: (id: string) => void;
  handleDeleteAll?: () => void;
}) {
  const {
    title,
    list,
    sizeValue,
    basedDimension,
    orientation,
    totalCustomRatios = 0,
    handleOrientationChange,
    handleNewCustomRatio,
    handleDeleteItem,
    handleDeleteAll,
  } = props;

  return (
    <List.Section title={title}>
      {list.map((ratio: RatioType, index: number) => {
        const calcBasedOnMin = (sizeValue * (ratio.width / ratio.height)).toFixed(2);
        const calcBasedOnMax = (sizeValue * (ratio.height / ratio.width)).toFixed(2);

        const calcValue =
          (orientation === Orientations.LANDSCAPE && basedDimension === BasedDimensions.BASED_WIDTH) ||
          (orientation === Orientations.PORTRAIT && basedDimension === BasedDimensions.BASED_HEIGHT)
            ? calcBasedOnMax
            : calcBasedOnMin;

        const valueMinMax = getMinMax(sizeValue, Number(calcValue));

        return (
          <List.Item
            key={index}
            title={
              orientation === Orientations.LANDSCAPE
                ? `${valueMinMax.max} × ${valueMinMax.min}`
                : `${valueMinMax.min} × ${valueMinMax.max}`
            }
            subtitle={
              orientation === Orientations.LANDSCAPE
                ? `${ratio.width}:${ratio.height}`
                : `${ratio.height}:${ratio.width}`
            }
            actions={
              <ActionOptions
                id={list[index].key}
                totalCustomRatios={totalCustomRatios}
                ratio={ratio}
                width={orientation === Orientations.LANDSCAPE ? valueMinMax.max : valueMinMax.min}
                height={orientation === Orientations.LANDSCAPE ? valueMinMax.min : valueMinMax.max}
                basedDimension={basedDimension}
                orientation={orientation}
                handleOrientationChange={() => handleOrientationChange()}
                handleNewCustomRatio={(ar: RatioType) => {
                  if (handleNewCustomRatio) {
                    handleNewCustomRatio(ar);
                  }
                }}
                handleDeleteItem={handleDeleteItem ? (id: string) => handleDeleteItem(id) : undefined}
                handleDeleteAll={handleDeleteAll ? () => handleDeleteAll() : undefined}
              />
            }
          />
        );
      })}
    </List.Section>
  );
}
