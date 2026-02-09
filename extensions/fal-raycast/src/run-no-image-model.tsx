import { LaunchProps, List, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getPreferences } from "./fal";
import {
  DEFAULT_NO_IMAGE_MODEL_KEY,
  LEGACY_DEFAULT_MODEL_KEY,
} from "./model-defaults";
import { ModelRunForm } from "./model-run-form";

type Arguments = {
  endpointId?: string;
};

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const argumentEndpointId = props.arguments.endpointId?.trim();
  const preferenceEndpointId =
    getPreferences().defaultNoImageEndpointId?.trim() ||
    getPreferences().defaultEndpointId?.trim();
  const { data: storedDefaultEndpointId, isLoading } =
    useCachedPromise(async () => {
      const noImageDefault = await LocalStorage.getItem<string>(
        DEFAULT_NO_IMAGE_MODEL_KEY,
      );
      const legacyDefault = await LocalStorage.getItem<string>(
        LEGACY_DEFAULT_MODEL_KEY,
      );
      return noImageDefault || legacyDefault;
    }, []);

  const endpointId =
    argumentEndpointId || storedDefaultEndpointId || preferenceEndpointId;

  if (!endpointId) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          title="No default no-image model configured"
          description="Set one from Browse Fal Models using Set as Default No-Image Model."
        />
      </List>
    );
  }

  return <ModelRunForm endpointId={endpointId} />;
}
