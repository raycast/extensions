import { Action, ActionPanel, Grid, LocalStorage } from "@raycast/api";
import { useState } from "react";
import ViewCar from "./viewCar";

const items = [
  // Cybertruck
  { content: "Cybertruck/Cybertruck.png", keywords: ["cybertruck", "cyberbeast"] },
  { content: "Cybertruck/CybertruckWhite.png", keywords: ["cybertruck", "cyberbeast", "white"] },
  { content: "Cybertruck/CybertruckBlack.png", keywords: ["cybertruck", "cyberbeast", "black"] },

  // Model 3
  { content: "3/Model3BlackAero.png", keywords: ["model 3", "black", "aero"] },
  { content: "3/Model3BlackPerf.png", keywords: ["model 3", "black", "performance"] },
  { content: "3/Model3BlueAero.png", keywords: ["model 3", "blue", "aero"] },
  { content: "3/Model3BluePerf.png", keywords: ["model 3", "blue", "performance"] },
  { content: "3/Model3RedAero.png", keywords: ["model 3", "red", "aero"] },
  { content: "3/Model3RedPerf.png", keywords: ["model 3", "red", "performance"] },
  { content: "3/Model3SilverAero.png", keywords: ["model 3", "silver", "aero"] },
  { content: "3/Model3SilverPerf.png", keywords: ["model 3", "silver", "performance"] },
  { content: "3/Model3WhiteAero.png", keywords: ["model 3", "white", "aero"] },
  { content: "3/Model3WhitePerf.png", keywords: ["model 3", "white", "performance"] },

  // Model Y
  { content: "Y/ModelYBlackAero.png", keywords: ["model y", "black", "aero"] },
  { content: "Y/ModelYBlackPerf.png", keywords: ["model y", "black", "performance"] },
  { content: "Y/ModelYBlueAero.png", keywords: ["model y", "blue", "aero"] },
  { content: "Y/ModelYBluePerf.png", keywords: ["model y", "blue", "performance"] },
  { content: "Y/ModelYRedAero.png", keywords: ["model y", "red", "aero"] },
  { content: "Y/ModelYRedPerf.png", keywords: ["model y", "red", "performance"] },
  { content: "Y/ModelYSilverAero.png", keywords: ["model y", "silver", "aero"] },
  { content: "Y/ModelYSilverPerf.png", keywords: ["model y", "silver", "performance"] },
  { content: "Y/ModelYWhiteAero.png", keywords: ["model y", "white", "aero"] },
  { content: "Y/ModelYWhitePerf.png", keywords: ["model y", "white", "performance"] },

  // Model S
  { content: "S/ModelSBlack.png", keywords: ["model s", "black"] },
  { content: "S/ModelSBlue.png", keywords: ["model s", "blue"] },
  { content: "S/ModelSRed.png", keywords: ["model s", "red"] },
  { content: "S/ModelSSilver.png", keywords: ["model s", "silver"] },
  { content: "S/ModelSWhite.png", keywords: ["model s", "white"] },
  { content: "S/ModelSTitanium.png", keywords: ["model s", "titanium"] },

  // Model X
  { content: "X/ModelXBlack.png", keywords: ["model x", "black"] },
  { content: "X/ModelXBlue.png", keywords: ["model x", "blue"] },
  { content: "X/ModelXRed.png", keywords: ["model x", "red"] },
  { content: "X/ModelXSilver.png", keywords: ["model x", "silver"] },
  { content: "X/ModelXWhite.png", keywords: ["model x", "white"] },
  { content: "X/ModelXTitanium.png", keywords: ["model x", "titanium"] },
];

export default function ChangeImage() {
  const [changedImage, setChanged] = useState(false);

  const changeImage = async (image: string) => {
    await LocalStorage.setItem("IMAGE", image);
    setChanged(true);
  };

  return changedImage ? (
    <ViewCar />
  ) : (
    <Grid columns={4} inset={Grid.Inset.Zero} navigationTitle="Filter..." searchBarPlaceholder="Filter images...">
      {items.map((item) => (
        <Grid.Item
          key={item.content}
          content={item.content}
          keywords={item.keywords}
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Submit Answer" onSubmit={() => changeImage(item.content)} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
