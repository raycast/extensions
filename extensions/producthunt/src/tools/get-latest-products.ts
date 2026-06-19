import { getFrontpageProducts } from "../api";
import { Product } from "../types";
import { logger } from "@chrismessina/raycast-logger";

const log = logger.child("[ProductHuntTool]");

/**
 * Returns the latest products from Product Hunt.
 * Provides comprehensive information about each product including topics, makers, and gallery status.
 */
export default async function (): Promise<
  Array<{
    title: string;
    description: string;
    author: string;
    submittedBy: string | null;
    link: string;
    votesCount: number;
    commentsCount: number;
    topics: string[];
    hunter: string | null;
    hasGallery: boolean;
    previousLaunches: number | null;
    makers: Array<{
      name: string;
      username: string;
      profileUrl: string | null;
    }> | null;
    createdAt: string;
  }>
> {
  try {
    const { products, error } = await getFrontpageProducts();

    if (error) {
      log.error("error fetching Product Hunt data", error);
      throw new Error(error);
    }

    return products.map((product: Product) => ({
      title: product.name,
      description: product.tagline,
      // The submitter (Post.user) is the only verified identity on a public token; makers are
      // redacted. Report it honestly rather than labeling it a maker.
      author: product.submittedBy?.name || product.maker?.name || "Unknown",
      submittedBy: product.submittedBy?.name || null,
      link: product.url,
      votesCount: product.votesCount,
      commentsCount: product.commentsCount,
      topics: product.topics.map((topic) => topic.name),
      hunter: product.hunter?.name || null,
      hasGallery: Boolean(product.galleryImages && product.galleryImages.length > 0),
      previousLaunches: product.previousLaunches || null,
      makers: product.makers
        ? product.makers.map((maker) => ({
            name: maker.name,
            username: maker.username,
            profileUrl: maker.profileUrl || null,
          }))
        : null,
      createdAt: product.createdAt,
    }));
  } catch (error) {
    log.error("error fetching Product Hunt data", error);
    throw error;
  }
}
