import { LaunchProps, List, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getPreferences } from "./fal";
import { DEFAULT_IMAGE_MODEL_KEY } from "./model-defaults";
import { ModelRunForm } from "./model-run-form";

type Arguments = {
  endpointId?: string;
};

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const argumentEndpointId = props.arguments.endpointId?.trim();
  const preferenceEndpointId = getPreferences().defaultImageEndpointId?.trim();
  const { data: storedDefaultEndpointId, isLoading } = useCachedPromise(
    LocalStorage.getItem<string>,
    [DEFAULT_IMAGE_MODEL_KEY],
  );

  const endpointId =
    argumentEndpointId || storedDefaultEndpointId || preferenceEndpointId;

  if (!endpointId) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          title="No default image-input model configured"
          description="Set one from Browse Fal Models using Set as Default Image-Input Model."
        />
      </List>
    );
  }

  return <ModelRunForm endpointId={endpointId} />;
}
