import { Detail, ActionPanel, Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { Product } from "../types";
import { useState } from "react";
import { ImageActions } from "./ImageActions";
import { ProductDetailView } from "./ProductDetailView";
import { ProductGalleryView } from "./ProductGalleryView";

interface ImageDetailProps {
  product: Product;
  imageUrl: string;
  imageIndex: number;
  allImages: string[];
}

export function ImageDetailView({ product, imageUrl, imageIndex, allImages }: ImageDetailProps) {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Create markdown content for the image details
  const markdown = `
  ![](${imageUrl})
  `;

  // Return to gallery view
  const returnToGallery = () => {
    navigation.push(<ProductGalleryView product={product} />);
  };

  // Handle navigation to previous image
  const navigateToPrevious = () => {
    if (imageIndex > 0) {
      const prevIndex = imageIndex - 1;
      const prevImageUrl = allImages[prevIndex];
      // Update the current view instead of pushing a new one
      setIsLoading(true);
      navigation.pop();
      navigation.push(
        <ImageDetailView product={product} imageUrl={prevImageUrl} imageIndex={prevIndex} allImages={allImages} />,
      );
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "This is the first image",
      });
    }
  };

  // Handle navigation to next image
  const navigateToNext = () => {
    if (imageIndex < allImages.length - 1) {
      const nextIndex = imageIndex + 1;
      const nextImageUrl = allImages[nextIndex];
      // Update the current view instead of pushing a new one
      setIsLoading(true);
      navigation.pop();
      navigation.push(
        <ImageDetailView product={product} imageUrl={nextImageUrl} imageIndex={nextIndex} allImages={allImages} />,
      );
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "This is the last image",
      });
    }
  };

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${product.name} - Image ${imageIndex + 1} of ${allImages.length}`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {/* Image Navigation Actions */}
          <ActionPanel.Section title="Navigation">
            {imageIndex > 0 && (
              <Action
                title="Previous Image"
                icon={Icon.ArrowLeft}
                shortcut={{ key: "arrowLeft", modifiers: [] }}
                onAction={navigateToPrevious}
              />
            )}
            {imageIndex < allImages.length - 1 && (
              <Action
                title="Next Image"
                icon={Icon.ArrowRight}
                shortcut={{ key: "arrowRight", modifiers: [] }}
                onAction={navigateToNext}
              />
            )}
            <Action
              title="Back to Gallery"
              icon={Icon.AppWindowGrid2x2}
              shortcut={{ modifiers: [], key: "return" }}
              onAction={returnToGallery}
            />
            <Action
              title="Back to Product Detail"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => {
                // Push a new product detail view
                navigation.push(<ProductDetailView product={product} />);
              }}
            />
          </ActionPanel.Section>

          {/* Image Actions */}
          <ActionPanel.Section title="Actions">
            <ImageActions imageUrl={imageUrl} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
