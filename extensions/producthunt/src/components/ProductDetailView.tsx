import { Detail, Color, showToast, Toast, open } from "@raycast/api";
import { Product } from "../types";
import { generateTopicUrl } from "../util/topicUtils";
import { useState, useEffect } from "react";
import { enhanceProductWithMetadata } from "../api/scraper";
import { HOST_URL } from "../constants";
import { ProductActions, ViewContext } from "./ProductActions";
import { cleanText } from "../util/textUtils";

interface ProductDetailViewProps {
  product: Product;
  index?: number;
  totalProducts?: number;
  onNavigateToProduct?: (product: Product, index: number) => void;
}

export function ProductDetailView({
  product: initialProduct,
  index,
  totalProducts,
  onNavigateToProduct,
}: ProductDetailViewProps) {
  const [product, setProduct] = useState<Product>(initialProduct);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEnhancedProduct = async () => {
      setIsLoading(true);
      try {
        const enhancedProduct = await enhanceProductWithMetadata(initialProduct);
        setProduct(enhancedProduct);
      } catch (error) {
        console.error("Error enhancing product:", error);
        // If enhancement fails, use the initial product
        setProduct(initialProduct);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnhancedProduct();
  }, [initialProduct.id]);

  const formattedDate = new Date(product.createdAt).toLocaleDateString();

  const displayImage = product.featuredImage || "";

  // Filter gallery images to ensure only valid URLs are used
  const validGalleryImages =
    product.galleryImages?.filter((img) => {
      try {
        // Check if it's a valid URL or base64 data URL
        return img && (img.startsWith("http") || img.startsWith("data:"));
      } catch (e) {
        console.error("Invalid gallery image URL:", img, e);
        return false;
      }
    }) || [];

  // Create markdown content for the product details
  const markdown = `
  # ${cleanText(product.name)}
  
  _${cleanText(product.tagline)}_
  
  ${displayImage ? `![${cleanText(product.name)}](${displayImage})` : ""}
  
  ${cleanText(product.description) || "No description available."}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={cleanText(product.name)}
      isLoading={isLoading}
      actions={
        <ProductActions
          product={product}
          validGalleryImages={validGalleryImages}
          index={index}
          totalProducts={totalProducts}
          onNavigateToProduct={onNavigateToProduct}
          viewContext={ViewContext.Detail}
          showTopics={true}
        />
      }
      metadata={
        <Detail.Metadata>
          {/* Product Stats */}
          <Detail.Metadata.Label title="Votes" text={product.votesCount.toString()} />
          <Detail.Metadata.Label title="Comments" text={product.commentsCount.toString()} />
          <Detail.Metadata.Label title="Launch Date" text={formattedDate} />

          {/* Ranking Information */}
          {product.dailyRank && <Detail.Metadata.Label title="Daily Rank" text={`#${product.dailyRank}`} />}
          {product.weeklyRank && <Detail.Metadata.Label title="Weekly Rank" text={`#${product.weeklyRank}`} />}

          {/* Previous Launches */}
          {product.previousLaunches && product.productHubUrl && (
            <Detail.Metadata.Link
              title="Previous Launches"
              text={`${product.previousLaunches} launches`}
              target={product.productHubUrl}
            />
          )}

          {/* Hunter Section - Always show hunter if available */}
          {product.hunter ? (
            <Detail.Metadata.TagList title="Hunter">
              <Detail.Metadata.TagList.Item
                key={product.hunter.id || "hunter"}
                text={product.hunter.name}
                color={Color.Orange}
                onAction={() => {
                  if (product.hunter?.profileUrl) {
                    showToast({
                      style: Toast.Style.Success,
                      title: `Opening hunter profile: ${product.hunter.name}`,
                    });
                    open(product.hunter.profileUrl);
                  } else if (product.hunter?.username) {
                    const profileUrl = `${HOST_URL}@${product.hunter.username}`;
                    showToast({
                      style: Toast.Style.Success,
                      title: `Opening hunter profile: ${product.hunter.name}`,
                    });
                    open(profileUrl);
                  }
                }}
              />
            </Detail.Metadata.TagList>
          ) : null}

          {/* Makers Section - Only show when we have makers */}
          {product.makers && product.makers.length > 0 ? (
            <Detail.Metadata.TagList title={product.makers.length === 1 ? "Maker" : "Makers"}>
              {/* Show all makers, including the hunter if they're listed as a maker */}
              {product.makers.map((maker, index) => (
                <Detail.Metadata.TagList.Item
                  key={maker.id || `maker-${index}`}
                  text={maker.name}
                  color={Color.Purple}
                  onAction={() => {
                    if (maker.profileUrl) {
                      showToast({
                        style: Toast.Style.Success,
                        title: `Opening maker profile: ${maker.name}`,
                      });
                      open(maker.profileUrl);
                    } else if (maker.username) {
                      const profileUrl = `${HOST_URL}@${maker.username}`;
                      showToast({
                        style: Toast.Style.Success,
                        title: `Opening maker profile: ${maker.name}`,
                      });
                      open(profileUrl);
                    }
                  }}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : product.maker && product.hunter && product.maker.name !== product.hunter.name ? (
            // Only show maker if it's not the same person as the hunter
            <Detail.Metadata.Label title="Maker" text={product.maker.name} />
          ) : null}

          {/* Topics Section */}
          {product.topics && product.topics.length > 0 && (
            <Detail.Metadata.TagList title="Topics">
              {product.topics.map((topic) => (
                <Detail.Metadata.TagList.Item
                  key={topic.id}
                  text={topic.name}
                  color={Color.Blue}
                  onAction={() => {
                    const topicUrl = generateTopicUrl(topic);

                    showToast({
                      style: Toast.Style.Success,
                      title: `Opening topic: ${topic.name}`,
                    });

                    // Open the topic URL in the browser
                    open(topicUrl);
                  }}
                />
              ))}
            </Detail.Metadata.TagList>
          )}

          {/* Built With Section */}
          {product.shoutouts && product.shoutouts.length > 0 && (
            <Detail.Metadata.TagList title="Built With">
              {product.shoutouts.map((shoutout) => (
                <Detail.Metadata.TagList.Item
                  key={shoutout.id}
                  text={shoutout.name}
                  color={Color.Green}
                  onAction={() => {
                    showToast({
                      style: Toast.Style.Success,
                      title: `Opening: ${shoutout.name}`,
                    });
                    open(shoutout.url);
                  }}
                />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
    />
  );
}
