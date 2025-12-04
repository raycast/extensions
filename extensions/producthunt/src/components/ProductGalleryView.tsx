import { Grid, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import { Product } from "../types";
import { useState, useEffect } from "react";
import { ImageDetailView } from "./ImageDetailView";
import { ImageActions } from "./ImageActions";
import { ProductDetailView } from "./ProductDetailView";

interface ProductGalleryViewProps {
  product: Product;
  images?: string[];
}

export function ProductGalleryView({ product, images }: ProductGalleryViewProps) {
  // Define all hooks at the top level in a consistent order
  const navigation = useNavigation();
  const [galleryImages, setGalleryImages] = useState<string[]>(images || []);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    // If images are provided directly, use those
    if (images && images.length > 0) {
      setGalleryImages(images);
      setIsLoading(false);
      return;
    }

    // Otherwise, use the gallery images from the product
    if (product.galleryImages && product.galleryImages.length > 0) {
      // Filter to ensure only valid URLs
      const validImages = product.galleryImages.filter(
        (img) => img && (img.startsWith("http") || img.startsWith("data:")),
      );
      setGalleryImages(validImages);
    }

    setIsLoading(false);
  }, [product, images]);

  // If no gallery images are available, show a message
  if (!isLoading && galleryImages.length === 0) {
    return (
      <Grid
        navigationTitle={`${product.name} - No Gallery Images`}
        isLoading={isLoading}
        searchBarPlaceholder="Search images..."
        columns={3}
      >
        <Grid.EmptyView
          title="No Gallery Images"
          description="This product doesn't have any gallery images to display."
          icon={Icon.Image}
        />
      </Grid>
    );
  }

  // Filter gallery images based on search text
  const filteredGalleryImages = galleryImages.filter((url) => url.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <Grid
      navigationTitle={`${product.name} - Gallery`}
      isLoading={isLoading}
      searchBarPlaceholder="Search images..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      columns={3}
    >
      {filteredGalleryImages.map((imageUrl: string, index: number) => {
        return (
          <Grid.Item
            key={`${imageUrl}-${index}`}
            content={{ source: imageUrl }}
            title={`Image ${index + 1}`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Image"
                  icon={Icon.Eye}
                  shortcut={{ modifiers: [], key: "return" }}
                  target={
                    <ImageDetailView
                      product={product}
                      imageUrl={imageUrl}
                      imageIndex={index}
                      allImages={filteredGalleryImages}
                    />
                  }
                />
                <Action
                  title="Back to Product Detail"
                  icon={Icon.Document}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => {
                    navigation.push(<ProductDetailView product={product} />);
                  }}
                />
                <ActionPanel.Section title="Image Actions">
                  <ImageActions imageUrl={imageUrl} showAsSubmenu={true} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
