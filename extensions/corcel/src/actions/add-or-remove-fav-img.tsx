import { Action, Icon, Toast, showToast } from "@raycast/api";
import { GeneratedImage, saveImageToStore } from "../lib/image";

export const AddOrRemoveImageFromFavoutitesAction: React.FC<{
  image: GeneratedImage;
  images: GeneratedImage[];
  setImages: (images: GeneratedImage[]) => void;
}> = ({ image, images, setImages }) => {
  return (
    <>
      {!image.favourite ? (
        <Action
          title="Add to Favourites"
          icon={Icon.Heart}
          onAction={() => {
            showToast({ title: "Adding to favourites", style: Toast.Style.Animated });
            const updatedImages = images.map((img) => {
              if (img.id === image.id) {
                return { ...img, favourite: true };
              } else {
                return img;
              }
            });
            setImages(updatedImages);
            saveImageToStore({ ...image, favourite: true })
              .then(() => {
                showToast({ title: "Added to favourites successfully!", style: Toast.Style.Success });
              })
              .catch(() => {
                showToast({ title: "Failed to add image to favourites.", style: Toast.Style.Failure });
              });
          }}
        />
      ) : (
        <Action
          title="Remove from Favourites"
          style={Action.Style.Destructive}
          icon={Icon.HeartDisabled}
          onAction={() => {
            showToast({ title: "Removing from favourites", style: Toast.Style.Animated });
            const updatedImages = images.map((img) => {
              if (img.id === image.id) {
                return { ...img, favourite: false };
              } else {
                return img;
              }
            });
            setImages(updatedImages);
            saveImageToStore({ ...image, favourite: false })
              .then(() => {
                showToast({ title: "Removed to favourites successfully!", style: Toast.Style.Success });
              })
              .catch(() => {
                showToast({ title: "Failed to remove image from favourites.", style: Toast.Style.Failure });
              });
          }}
        />
      )}
    </>
  );
};
