/**
 * @file apply-filter.tsx
 *
 * @summary Raycast command to apply filters on selected images.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:52:33
 * Last modified  : 2023-07-06 15:47:50
 */

import { Action, ActionPanel, Grid, showToast, Toast } from "@raycast/api";

import applyFilter from "./operations/filterOperation";
import { filters } from "./utilities/filters";
import { Filter } from "./utilities/types";
import { cleanup, getSelectedImages, showErrorToast } from "./utilities/utils";

export default function Command() {
  /**
   * Applies the specified filter to the selected images.
   *
   * @param filter The filter to apply.
   * @returns A promise that resolves when the filter has been applied.
   */
  const performFilter = async (filter: Filter) => {
    const selectedImages = await getSelectedImages();
    if (selectedImages.length === 0 || (selectedImages.length === 1 && selectedImages[0] === "")) {
      await showToast({ title: "No images selected", style: Toast.Style.Failure });
      return;
    }

    const toast = await showToast({ title: "Filtering in progress...", style: Toast.Style.Animated });
    const pluralized = `image${selectedImages.length === 1 ? "" : "s"}`;
    try {
      await applyFilter(selectedImages, filter);
      toast.title = `Applied ${filter.name} Filter To ${selectedImages.length.toString()} ${pluralized}`;
      toast.style = Toast.Style.Success;
    } catch (error) {
      await showErrorToast(`Failed To Apply Filter`, error as Error, toast);
    } finally {
      await cleanup();
    }
  };

  const gridItems = filters.map((filter) => (
    <Grid.Item
      title={filter.name}
      subtitle={filter.description}
      key={filter.name}
      content={{ source: filter.thumbnail }}
      actions={
        <ActionPanel>
          <Action title={`Apply ${filter.name} Filter`} onAction={async () => await performFilter(filter)} />
        </ActionPanel>
      }
    />
  ));

  return <Grid searchBarPlaceholder="Search filters...">{gridItems}</Grid>;
}
