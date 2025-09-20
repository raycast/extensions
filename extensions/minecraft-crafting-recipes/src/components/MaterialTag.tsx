import { List } from "@raycast/api";
import stc from "string-to-color";

export interface MaterialTagProps {
  material: string;

  setSearchText?: (text: string) => void;
}

const materialWordColors: Record<string, string> = {
  amethyst: "mediumorchid",
  bucket: "lightgrey",
  chest: "brick",
  diamond: "cyan",
  dirt: "saddlebrown",
  egg: "beige",
  emerald: "emeraldgreen",
  hopper: "darkgray",
  iron: "silver",
  log: "brown",
  melon: "red",
  milk: "white",
  minecart: "silver",
  moss: "darkgreen",
  nether: "darkred",
  paper: "white",
  sculk: "darkcyan",
  slime: "chartreuse",
  soul: "peacock",
  "spider eye": "darkred",
  stick: "brick",
  stone: "darkgray",
  sugar: "white",
  tnt: "red",
  wheat: "olive",
  wood: "brick",
};

export default function MaterialTag({ material, setSearchText }: MaterialTagProps) {
  const materialLowercase = material.toLowerCase();
  let materialColorString = materialLowercase;

  for (const [materialWord, color] of Object.entries(materialWordColors)) {
    if (materialLowercase.includes(materialWord)) {
      materialColorString += ` ${color}`;
    }
  }

  return (
    <List.Item.Detail.Metadata.TagList.Item
      text={material}
      color={stc(materialColorString)}
      onAction={() => {
        setSearchText?.(material);
      }}
    />
  );
}
