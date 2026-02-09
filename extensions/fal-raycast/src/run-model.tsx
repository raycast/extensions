import { LaunchProps, List, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getSelectedImagePath } from "./finder";
import {
  LAST_USED_IMAGE_MODEL_KEY,
  LAST_USED_MODEL_KEY,
} from "./model-defaults";
import { ModelRunForm } from "./model-run-form";

type Arguments = {
  endpointId?: string;
};

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const argumentEndpointId = props.arguments.endpointId?.trim();
  const { data: selectedImagePath, isLoading: isLoadingSelectedImagePath } =
    useCachedPromise(getSelectedImagePath, []);
  const { data: lastUsedModelEndpointId, isLoading: isLoadingLastUsedModel } =
    useCachedPromise(LocalStorage.getItem<string>, [LAST_USED_MODEL_KEY]);
  const {
    data: lastUsedImageModelEndpointId,
    isLoading: isLoadingLastUsedImageModel,
  } = useCachedPromise(LocalStorage.getItem<string>, [
    LAST_USED_IMAGE_MODEL_KEY,
  ]);

  const hasSelectedImage = Boolean(selectedImagePath);
  const endpointId =
    argumentEndpointId ||
    (hasSelectedImage ? lastUsedImageModelEndpointId : lastUsedModelEndpointId);
  const isLoading =
    isLoadingSelectedImagePath ||
    isLoadingLastUsedModel ||
    isLoadingLastUsedImageModel;

  if (!endpointId) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          title={
            hasSelectedImage ? "No last used image model" : "No last used model"
          }
          description={
            hasSelectedImage
              ? "Run any image-input model once, then this command will reuse it whenever an image is selected in Finder."
              : "Run any model once, then this command will always reopen that last used model."
          }
        />
      </List>
    );
  }

  return <ModelRunForm endpointId={endpointId} />;
}
