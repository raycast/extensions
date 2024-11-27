import { Action, ActionPanel, Grid, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import ViewCar from "./view-car";
import { ViewDirection } from "./types/ViewDirection";
import { useCachedState } from "@raycast/utils";
import { ConnectedDrive, Regions } from "bmw-connected-drive";
import { getImage } from "./utils/getImage";

export default function ChangeImage() {
  const [changedImage, setChanged] = useState(false);

  const [images, setImages] = useCachedState<{ view: ViewDirection; image: string }[]>("images", []);

  const [isLoading, setIsLoading] = useState(true);
  const [, setImage] = useCachedState<{ view: ViewDirection; image: string }>("image", {
    view: ViewDirection.FRONTSIDE,
    image: "",
  });

  const api = useRef<ConnectedDrive | null>(null);

  useEffect(() => {
    const imagesArray = [];

    (async () => {
      const { username, password, region } = getPreferenceValues<{
        username: string;
        VIN?: string;
        password: string;
        region: Regions;
      }>();

      api.current = new ConnectedDrive(username, password, region);

      try {
        const vehiclesResp = await api.current.getVehicles();
        const VIN = vehiclesResp[0].vin;

        for (const view of Object.values(ViewDirection)) {
          const imageResp = await getImage(VIN, view, api.current?.account);
          const imageObj = {
            view: view,
            image: imageResp,
          };
          imagesArray.push(imageObj);
        }

        setImages(imagesArray);
      } catch (e) {
        if (e instanceof Error) {
          showToast({ style: Toast.Style.Failure, title: e.message });
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const changeImage = async (image: { view: ViewDirection; image: string }) => {
    setImage(image);
    setChanged(true);
  };

  return changedImage ? (
    <ViewCar command={undefined} />
  ) : (
    <Grid
      isLoading={isLoading}
      columns={3}
      inset={Grid.Inset.Zero}
      aspectRatio="16/9"
      searchBarPlaceholder="Filter images..."
    >
      {images.map((item, index) => (
        <Grid.Item
          key={index}
          content={item.image}
          keywords={[item.view]}
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Choose" onSubmit={() => changeImage(item)} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
