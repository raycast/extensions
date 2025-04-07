import * as cheerio from "cheerio";
import { cleanText, sanitizeJsonString } from "../util/textUtils";
import { Product, Topic, User, Shoutout } from "../types";
import { processImageUrl, ImgixFit } from "./imgix";
import { fetchSvgAsBase64 } from "../util/imageUtils";
import { HOST_URL } from "../constants";

// Interface for Apollo event data
interface ApolloEvent {
  type: string;
  result: {
    data: {
      homefeed?: {
        edges: Array<{
          node: {
            id: string;
            items: Array<ApolloPostItem>;
          };
        }>;
      };
      post?: ApolloPostItem;
      search?: {
        edges: Array<{
          node: ApolloPostItem;
        }>;
      };
      topics?: {
        edges: Array<{
          node: {
            id: string;
            name: string;
            slug: string;
            description?: string;
            followersCount?: number;
            postsCount?: number;
          };
        }>;
      };
    };
  };
}

// Interface for Apollo post item
interface ApolloPostItem {
  __typename: string;
  id: string;
  name: string;
  tagline: string;
  description?: string;
  slug: string;
  thumbnailImageUuid?: string;
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    username: string;
    profileImage: string;
  };
  hunter?: {
    id: string;
    name: string;
    username: string;
    profileImage: string;
  };
  makers?: Array<{
    id: string;
    name: string;
    username: string;
    profileImage: string;
  }>;
  topics?: {
    edges: Array<{
      node: {
        id: string;
        name: string;
        slug: string;
      };
    }>;
  };
  // Gallery and media fields for images
  media?: Array<{
    url?: string;
    imageUuid?: string;
    type?: string;
  }>;
  gallery?: Array<{
    url?: string;
    imageUuid?: string;
    type?: string;
  }>;
}

// Interface for RSS feed items
export interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  author: string;
  content: string;
  contentSnippet: string;
  id: string;
  isoDate: string;
  updated: string;
}

// Open Graph metadata interface
interface OpenGraphMetadata {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  canonicalUrl?: string; // The canonical URL for the page
  siteName?: string;
  type?: string;
}

// sanitizeJsonString has been moved to textUtils.ts

// findLastValidJson has been moved to textUtils.ts

// aggressiveSanitization has been moved to textUtils.ts

// Extract username from a Product Hunt profile URL
function extractUsernameFromUrl(url: string): string {
  if (!url) return "";

  const urlPath = url.split("/");
  const lastPathSegment = urlPath[urlPath.length - 1];

  if (!lastPathSegment) {
    return "";
  }

  // Handle both formats: /@username and /username
  return lastPathSegment.startsWith("@") ? lastPathSegment.substring(1) : lastPathSegment;
}

// Ensure consistent tagline formatting by using the cleanText utility
function formatTagline(tagline: string | undefined | null): string {
  return cleanText(tagline);
}

// Clean up topic names by replacing incorrectly encoded characters
function cleanTopicName(name: string | undefined | null): string {
  return cleanText(name);
}

// Normalize image URLs for consistent processing
function normalizeImageUrl(url: string): string {
  if (!url.includes(".svg") && url.includes("imgix.net")) {
    return processImageUrl(url, {
      fit: ImgixFit.CROP,
      auto: ["format", "compress"],
      width: 1200,
      height: 800,
    });
  }
  return url;
}

// Normalize thumbnail URLs with thumbnail-specific dimensions
function normalizeThumbnailUrl(url: string): string {
  if (!url.includes(".svg") && url.includes("imgix.net")) {
    return processImageUrl(url, {
      fit: ImgixFit.CROP,
      auto: ["format", "compress"],
      width: 1024,
      height: 512,
    });
  }
  return url;
}

// Parse RSS feed from Product Hunt
export async function getFrontpageProducts(): Promise<{ products: Product[]; error?: string }> {
  try {
    const response = await fetch(HOST_URL);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find the Apollo state data embedded in the script tag
    const scriptContent = $('script:contains("ApolloSSRDataTransport")').text();
    const apolloDataMatch = scriptContent.match(/"events":(\[.+\])\}\)/)?.[1];

    if (!apolloDataMatch) {
      throw new Error("Could not extract Apollo data from the page");
    }

    const sanitizedData = sanitizeJsonString(apolloDataMatch);

    if (!sanitizedData) {
      throw new Error("Failed to sanitize Apollo data");
    }

    let apolloData;
    try {
      apolloData = JSON.parse(sanitizedData) as ApolloEvent[];
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error(
        `Failed to parse Apollo data: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
      );
    }

    // Find the homefeed data
    const homefeedEvent = apolloData.find((event) => event.type === "data" && event.result.data.homefeed);

    if (!homefeedEvent) {
      throw new Error("Could not find homefeed data");
    }

    // Get the featured products
    const featuredEdge = homefeedEvent.result.data.homefeed?.edges.find((edge) => edge.node.id === "FEATURED-0");

    if (!featuredEdge) {
      throw new Error("Could not find featured products");
    }

    // Extract product data
    const productItems = featuredEdge.node.items.filter((item) => item.__typename === "Post");

    // Transform to our Product type
    const products = productItems.map((item) => ({
      id: item.id,
      name: cleanText(item.name),
      tagline: formatTagline(item.tagline),
      description: cleanText(item.description || ""),
      url: `${HOST_URL}posts/${item.slug}`,
      thumbnail: item.thumbnailImageUuid ? `https://ph-files.imgix.net/${item.thumbnailImageUuid}` : "",
      votesCount: item.votesCount || 0,
      commentsCount: item.commentsCount || 0,
      createdAt: item.createdAt,
      maker: item.user
        ? {
            id: item.user.id,
            name: item.user.name,
            username: item.user.username,
            avatarUrl: item.user.profileImage,
            profileImage: item.user.profileImage,
          }
        : undefined,
      topics:
        item.topics?.edges?.map((edge) => ({
          id: edge.node.id,
          name: cleanTopicName(edge.node.name),
          slug: edge.node.slug,
        })) || [],
    }));

    return { products };
  } catch (error) {
    console.error("Error fetching frontpage products:", error);
    return { products: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Enhance a product with Open Graph metadata and detailed information
// Scrape detailed product information from a Product Hunt page
async function scrapeDetailedProductInfo(product: Product): Promise<Product> {
  try {
    const response = await fetch(product.url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract canonical URL if available
    const canonicalUrl = $('link[rel="canonical"]').attr("href");
    if (canonicalUrl) {
      product.url = canonicalUrl;
    }

    // Find the Apollo state data embedded in the script tag
    const scriptContent = $('script:contains("ApolloSSRDataTransport")').text();
    const apolloDataMatch = scriptContent.match(/"events":(\[.+\])\}\)/)?.[1];

    // Initialize variables for the enhanced data
    let makers: User[] = [];
    let hunter: User | undefined;
    const galleryImages: string[] = [];
    const shoutouts: Shoutout[] = [];
    let weeklyRank: number | undefined;
    let dailyRank: number | undefined;
    let productHubUrl: string | undefined;
    let previousLaunches: number | undefined;

    // Initialize flags to track what sections we've found
    let foundHunterSection = false;
    let foundMakerSection = false;

    // Extract data using Cheerio selectors

    // 1. Extract hunter and makers
    // First, try to extract data from the Apollo state which is more reliable
    if (apolloDataMatch) {
      const sanitizedData = sanitizeJsonString(apolloDataMatch);

      if (sanitizedData) {
        try {
          const apolloData = JSON.parse(sanitizedData) as ApolloEvent[];

          // Find the post data
          const postEvent = apolloData.find((event) => event.type === "data" && event.result.data.post);

          if (postEvent && postEvent.result.data.post) {
            const postData = postEvent.result.data.post;

            // Try to extract hunter from Apollo data
            if (postData.hunter) {
              hunter = {
                id: postData.hunter.id || "hunter",
                name: postData.hunter.name,
                username: postData.hunter.username,
                avatarUrl: postData.hunter.profileImage || "",
                profileImage: postData.hunter.profileImage,
                profileUrl: `${HOST_URL}@${postData.hunter.username}`,
              };
            }

            // Try to extract makers from Apollo data
            if (postData.makers && Array.isArray(postData.makers)) {
              makers = postData.makers.map((maker) => ({
                id: maker.id || `maker-${maker.username}`,
                name: maker.name,
                username: maker.username,
                avatarUrl: maker.profileImage || "",
                profileImage: maker.profileImage,
                profileUrl: `${HOST_URL}@${maker.username}`,
              }));
            }
          }
        } catch (parseError) {
          console.error("Error parsing Apollo data:", parseError);
        }
      }
    }

    // Fallback to HTML scraping if Apollo data didn't provide what we need

    // ALWAYS prioritize the "About this launch" section as the most reliable source
    const aboutLaunchSection = $(
      '[data-test="about-section"], div.text-14.font-normal.text-dark-gray.text-gray-600, h2:contains("About this launch")',
    ).parent();

    if (aboutLaunchSection.length > 0) {
      const aboutText = aboutLaunchSection.text();
      console.log("About launch text:", aboutText);

      // STEP 1: Extract hunter information - EVERY product has exactly one hunter
      if (!hunter) {
        // Find all links in the about section
        const allLinks = aboutLaunchSection.find("a");

        // First pass: Look for the phrase "hunted by" and get the link immediately after it
        const aboutHtml = aboutLaunchSection.html() || "";
        // Look specifically for "hunted by" followed by a link
        const hunterRegex = /(?:was\s+)?hunted\s+by\s+[^<]*?<a\s+[^>]*?href="([^"]+)"[^>]*?>([^<]+)<\/a>/i;
        const hunterMatch = aboutHtml.match(hunterRegex);

        if (hunterMatch && hunterMatch[1] && hunterMatch[2]) {
          const hunterUrl = hunterMatch[1];
          const hunterName = hunterMatch[2].trim();
          const username = extractUsernameFromUrl(hunterUrl);

          hunter = {
            id: "hunter",
            name: hunterName,
            username: username,
            avatarUrl: "",
            profileUrl: hunterUrl.startsWith("http") ? hunterUrl : `${HOST_URL}${hunterUrl}`,
          };

          foundHunterSection = true;
          console.log("Found hunter using regex:", hunterName, "with URL:", hunterUrl, "username:", username);
        } else {
          // Second pass: Scan all links and look for ones that appear right after "hunted by" text
          allLinks.each((i, el) => {
            if (foundHunterSection) return false; // Already found the hunter, break the loop

            const link = $(el);
            const linkText = link.text().trim();
            // Get content before this link to check for "hunted by"
            // Create a safer version of getting HTML content before the link
            let beforeLink = "";
            try {
              // Try to get the HTML content of the about section
              const aboutHtmlContent = aboutLaunchSection.html() || "";
              // Find the position of this link in the HTML
              const linkPosition = aboutHtmlContent.indexOf(link.toString());
              // Get the content before the link
              if (linkPosition > 0) {
                beforeLink = aboutHtmlContent.substring(0, linkPosition);
              }
            } catch (error) {
              console.error("Error getting HTML before link:", error);
            }

            // Check if "hunted by" appears right before this link
            const hunterPhrasePos = beforeLink.lastIndexOf("hunted by");
            if (hunterPhrasePos !== -1 && hunterPhrasePos > beforeLink.length - 50) {
              const hunterUrl = link.attr("href") || "";
              const username = extractUsernameFromUrl(hunterUrl);

              hunter = {
                id: "hunter",
                name: linkText,
                username: username,
                avatarUrl: "",
                profileUrl: hunterUrl.startsWith("http") ? hunterUrl : `${HOST_URL}${hunterUrl}`,
              };

              foundHunterSection = true;
              console.log("Found hunter by proximity:", linkText, "with URL:", hunterUrl);
              return false; // Break the loop
            }
          });
        }

        if (!foundHunterSection) {
          console.log("Could not find hunter in the about section");
        }
      } else {
        foundHunterSection = true;
      }

      // STEP 2: Extract maker information - a product MAY have makers
      // Only look for makers if we don't already have them from Apollo data
      if (makers.length === 0 && aboutText.includes("Made by")) {
        // Look for makers using a more reliable approach
        const aboutHtml = aboutLaunchSection.html() || "";

        // Define regex to find "Made by" followed by links
        const makerSectionRegex = /Made\s+by\s+([\s\S]*?)(?:Featured\s+on|in\s+<a[^>]*?href="\/topics\/)/i;
        const makerSectionMatch = aboutHtml.match(makerSectionRegex);

        if (makerSectionMatch && makerSectionMatch[1]) {
          foundMakerSection = true;
          const makerSection = makerSectionMatch[1];

          // Get all links in the maker section
          const makerLinksMatches = makerSection.match(/<a\s+[^>]*?href="([^"]+)"[^>]*?>([^<]+)<\/a>/g) || [];

          for (const linkMatch of makerLinksMatches) {
            const urlMatch = linkMatch.match(/href="([^"]+)"/i);
            const nameMatch = linkMatch.match(/>([^<]+)<\/a>/i);

            if (urlMatch && urlMatch[1] && nameMatch && nameMatch[1]) {
              const makerUrl = urlMatch[1];
              const makerName = nameMatch[1].trim();

              // Skip topic links and non-user profile links
              if (makerUrl.includes("/topics/") || !makerUrl.includes("@")) {
                continue;
              }

              const username = extractUsernameFromUrl(makerUrl);

              // Skip if this is actually the hunter (unless they're explicitly listed as a maker)
              if (hunter && username === hunter.username && !makerSection.includes("Made by")) {
                console.log("Skipping hunter from makers list:", makerName);
                continue;
              }

              // Skip if no username or if this is a duplicate
              if (!username || makers.some((m) => m.username === username)) {
                continue;
              }

              makers.push({
                id: `maker-${username}`,
                name: makerName,
                username: username,
                avatarUrl: "", // We'll skip avatar for simplicity
                profileUrl: makerUrl.startsWith("http") ? makerUrl : `${HOST_URL}${makerUrl}`,
              });

              console.log("Found maker:", makerName, "with URL:", makerUrl);
            }
          }
        }

        if (!foundMakerSection) {
          console.log("No makers section found, or no makers in this product");
        }
      }
    }

    // Get the Apollo post data if it exists
    let apolloPostData: ApolloPostItem | undefined;
    try {
      // Check if we already parsed Apollo data earlier
      const scriptContent = $('script:contains("ApolloSSRDataTransport")').text();
      const apolloDataMatch = scriptContent.match(/"events":(\[.+\])\}\)/)?.[1];

      if (apolloDataMatch) {
        const sanitizedData = sanitizeJsonString(apolloDataMatch);
        if (sanitizedData) {
          const apolloData = JSON.parse(sanitizedData) as ApolloEvent[];
          const postEvent = apolloData.find((event: ApolloEvent) => event.type === "data" && event.result.data.post);
          if (postEvent && postEvent.result.data.post) {
            apolloPostData = postEvent.result.data.post;
          }
        }
      }
    } catch (e) {
      console.error("Error getting Apollo post data:", e);
    }

    // Only use Apollo data as a fallback for hunter
    if (!hunter && apolloPostData && apolloPostData.hunter) {
      hunter = {
        id: apolloPostData.hunter.id || "hunter",
        name: apolloPostData.hunter.name,
        username: apolloPostData.hunter.username,
        avatarUrl: apolloPostData.hunter.profileImage || "",
        profileUrl: `${HOST_URL}@${apolloPostData.hunter.username}`,
      };
    }

    // Only use Apollo data as a fallback for makers
    if (
      makers.length === 0 &&
      apolloPostData &&
      apolloPostData.makers &&
      Array.isArray(apolloPostData.makers) &&
      apolloPostData.makers.length > 0
    ) {
      makers = apolloPostData.makers.map((maker) => ({
        id: maker.id || `maker-${maker.username}`,
        name: maker.name,
        username: maker.username,
        avatarUrl: maker.profileImage || "",
        profileImage: maker.profileImage,
        profileUrl: `${HOST_URL}@${maker.username}`,
      }));
    }

    // If we have a hunter badge in the team section but no hunter yet, use that as a last resort
    if (!hunter) {
      const teamSection = $('.styles_metadataItem__YJEgI:contains("Meet the team"), [data-test="team-section"]');
      if (teamSection.length > 0) {
        // Find team members with a "Hunter" badge
        teamSection.find("a").each((i, el) => {
          const teamMemberEl = $(el);
          const hasHunterBadge = teamMemberEl.find('span:contains("Hunter"), [data-test="hunter-badge"]').length > 0;

          if (hasHunterBadge) {
            const hunterUrl = teamMemberEl.attr("href");
            const hunterName = teamMemberEl.find("div").first().text().trim() || teamMemberEl.text().trim();
            const hunterImage = teamMemberEl.find("img").attr("src");

            if (hunterName && hunterUrl) {
              const username = extractUsernameFromUrl(hunterUrl);

              hunter = {
                id: "hunter",
                name: hunterName,
                username: username,
                avatarUrl: hunterImage || "",
                profileUrl: hunterUrl.startsWith("http") ? hunterUrl : `${HOST_URL}${hunterUrl}`,
              };
              return false; // Break the loop once we find a hunter
            }
          }
        });
      }
    }

    // 2. Extract gallery images
    console.log('Looking for gallery images with data-sentry-component="Gallery"');

    // First try to find the gallery component by data-sentry-component attribute
    const galleryContainer = $('[data-sentry-component="Gallery"]');

    // Also look for any elements with 'gallery' in their class or id
    const galleryClassElements = $(
      '[class*="gallery" i], [id*="gallery" i], [class*="carousel" i], [id*="carousel" i]',
    );

    console.log(`Found ${galleryClassElements.length} elements with gallery/carousel in class or id`);

    if (galleryContainer.length > 0) {
      console.log('Found gallery container with data-sentry-component="Gallery"');

      // Find all images within the gallery container
      galleryContainer.find("img").each((i, el) => {
        const imgSrc = $(el).attr("src");
        // console.log(`Found gallery image: ${imgSrc}`);

        if (imgSrc && !galleryImages.includes(imgSrc)) {
          galleryImages.push(normalizeImageUrl(imgSrc));
        }
      });
    } else if (galleryClassElements.length > 0) {
      console.log("Found elements with gallery/carousel in class or id");

      // Find all images within these elements
      galleryClassElements.find("img").each((i, el) => {
        const imgSrc = $(el).attr("src");
        console.log(`Found gallery image: ${imgSrc}`);

        if (imgSrc && !galleryImages.includes(imgSrc)) {
          galleryImages.push(normalizeImageUrl(imgSrc));
        }
      });
    } else {
      console.log("No gallery containers found, falling back to class selectors");

      // Fallback to the old selectors if the gallery component isn't found
      $(".styles_imageContainer__Hm_9x img, .styles_image__wG8b_ img").each((i, el) => {
        const imgSrc = $(el).attr("src");
        if (imgSrc && !galleryImages.includes(imgSrc)) {
          galleryImages.push(normalizeImageUrl(imgSrc));
        }
      });
    }

    // Also look for SVG images that might be in the page
    $("svg").each((i, el) => {
      const svgSrc = $(el).attr("src");
      if (svgSrc && svgSrc.includes(".svg") && !galleryImages.includes(svgSrc)) {
        galleryImages.push(svgSrc);
      }
    });

    // If no gallery images found yet, try to extract them from the Apollo data
    if (galleryImages.length === 0 && apolloDataMatch) {
      console.log("Trying to extract gallery images from Apollo data");
      try {
        const sanitizedData = sanitizeJsonString(apolloDataMatch);

        if (sanitizedData) {
          const apolloData = JSON.parse(sanitizedData) as ApolloEvent[];

          // Find the post data
          const postEvent = apolloData.find((event) => event.type === "data" && event.result.data.post);

          if (postEvent && postEvent.result.data.post) {
            const postData = postEvent.result.data.post;

            // Look for media or gallery fields in the Apollo data
            if (postData.media && Array.isArray(postData.media)) {
              console.log(`Found ${postData.media.length} media items in Apollo data`);
              // Using 'any' as Apollo state structure can be complex/variable
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              postData.media.forEach((mediaItem: any) => {
                if (mediaItem.url && !galleryImages.includes(mediaItem.url)) {
                  console.log(`Adding media item from Apollo data: ${mediaItem.url}`);
                  galleryImages.push(mediaItem.url);
                } else if (mediaItem.imageUuid) {
                  const imgUrl = `https://ph-files.imgix.net/${mediaItem.imageUuid}`;
                  if (!galleryImages.includes(imgUrl)) {
                    console.log(`Adding gallery item with imageUuid from Apollo data: ${imgUrl}`);
                    galleryImages.push(imgUrl);
                  }
                }
              });
            }

            // Look for gallery field
            if (postData.gallery && Array.isArray(postData.gallery)) {
              console.log(`Found ${postData.gallery.length} gallery items in Apollo data`);
              // Using 'any' as Apollo state structure can be complex/variable
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              postData.gallery.forEach((galleryItem: any) => {
                if (galleryItem.url && !galleryImages.includes(galleryItem.url)) {
                  console.log(`Adding gallery item from Apollo data: ${galleryItem.url}`);
                  galleryImages.push(galleryItem.url);
                } else if (galleryItem.imageUuid) {
                  const imgUrl = `https://ph-files.imgix.net/${galleryItem.imageUuid}`;
                  if (!galleryImages.includes(imgUrl)) {
                    console.log(`Adding gallery item with imageUuid from Apollo data: ${imgUrl}`);
                    galleryImages.push(imgUrl);
                  }
                }
              });
            }
          }
        }
      } catch (error) {
        console.error("Error extracting gallery images from Apollo data:", error);
      }
    }

    console.log(`Found ${galleryImages.length} gallery images total`);

    // 3. Extract shoutouts (built with)
    $('.styles_builtWithContainer__hMCFG a, [data-test="built-with-item"]').each((i, el) => {
      const shoutoutLink = $(el).attr("href");
      const shoutoutName = $(el).find("div").first().text().trim() || $(el).text().trim();
      const shoutoutImg = $(el).find("img").attr("src");

      if (shoutoutName && shoutoutLink) {
        shoutouts.push({
          id: `shoutout-${i}`,
          name: shoutoutName,
          url: shoutoutLink.startsWith("http") ? shoutoutLink : `${HOST_URL}${shoutoutLink}`,
          thumbnail: shoutoutImg || "",
        });
      }
    });

    // 4. Extract ranks
    const rankText = $('.styles_rankContainer__Oc9ce, [data-test="product-rank"]').text();
    const dailyRankMatch = rankText.match(/#(\d+) Today/);
    const weeklyRankMatch = rankText.match(/#(\d+) This Week/);

    if (dailyRankMatch && dailyRankMatch[1]) {
      dailyRank = parseInt(dailyRankMatch[1], 10);
    }

    if (weeklyRankMatch && weeklyRankMatch[1]) {
      weeklyRank = parseInt(weeklyRankMatch[1], 10);
    }

    // 5. Check for product hub (multiple launches)
    const productHubLink = $('a:contains("See"), a:contains("previous launches")');
    if (productHubLink.length > 0) {
      const hubUrl = productHubLink.attr("href");
      if (hubUrl) {
        productHubUrl = hubUrl.startsWith("http") ? hubUrl : `${HOST_URL}${hubUrl}`;

        // Try to extract the number of previous launches
        const launchesText = productHubLink.text();
        const launchesMatch = launchesText.match(/(\d+)\s+previous/);
        if (launchesMatch && launchesMatch[1]) {
          previousLaunches = parseInt(launchesMatch[1], 10);
        }
      }
    }

    // If we have Apollo data, try to extract more accurate information
    if (apolloDataMatch) {
      const sanitizedData = sanitizeJsonString(apolloDataMatch);

      if (sanitizedData) {
        try {
          const apolloData = JSON.parse(sanitizedData) as ApolloEvent[];

          // Find the post data
          const postEvent = apolloData.find((event) => event.type === "data" && event.result.data.post);

          if (postEvent && postEvent.result.data.post) {
            const postData = postEvent.result.data.post;

            // Update vote and comment counts with more accurate data
            if (postData.votesCount !== undefined) {
              product.votesCount = postData.votesCount;
            }

            if (postData.commentsCount !== undefined) {
              product.commentsCount = postData.commentsCount;
            }

            // Extract additional maker information if available
            if (postData.user && makers.length === 0) {
              makers.push({
                id: postData.user.id,
                name: postData.user.name,
                username: postData.user.username,
                avatarUrl: postData.user.profileImage || "",
                profileImage: postData.user.profileImage,
                profileUrl: `${HOST_URL}@${postData.user.username}`,
              });
            }
          }
        } catch (parseError) {
          console.error("Error parsing Apollo data:", parseError);
        }
      }
    }

    // Return the enhanced product
    return {
      ...product,
      makers: makers.length > 0 ? makers : undefined,
      hunter,
      galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
      shoutouts: shoutouts.length > 0 ? shoutouts : undefined,
      weeklyRank,
      dailyRank,
      productHubUrl,
      previousLaunches,
    };
  } catch (error) {
    console.error(`Error scraping detailed product info for ${product.id}:`, error);
    return product;
  }
}

export async function enhanceProductWithMetadata(product: Product): Promise<Product> {
  try {
    const metadata = await scrapeOpenGraphMetadata(product.url);

    // Use canonical URL if available
    if (metadata.canonicalUrl) {
      product.url = metadata.canonicalUrl;
    }

    // Extract the product slug from the URL for image fallback
    let thumbnailUrl = metadata.image || product.thumbnail;
    const slugMatch = product.url.match(/posts\/([^/]+)$/);
    const slug = slugMatch ? slugMatch[1] : null;

    // If we have a slug but no valid thumbnail, try to construct a reliable URL
    if ((!thumbnailUrl || thumbnailUrl === "") && slug) {
      // Try to fetch the product page to find image references
      try {
        const response = await fetch(product.url);
        if (response.ok) {
          const html = await response.text();
          const $ = cheerio.load(html);

          // Look for image references in the page
          const ogImage = $('meta[property="og:image"]').attr("content");
          const twitterImage = $('meta[name="twitter:image"]').attr("content");

          // Use the first available image
          thumbnailUrl = ogImage || twitterImage || thumbnailUrl;
        }
      } catch (error) {
        console.error(`Error fetching product page for ${slug}:`, error);
      }

      // If we still don't have a valid thumbnail, use a fallback
      if (!thumbnailUrl || thumbnailUrl === "") {
        // Use a generic Product Hunt image with the product slug
        thumbnailUrl = `https://ph-files.imgix.net/${slug}?auto=format&fit=crop&h=512&w=1024`;
      }
    }

    // Process the thumbnail URL
    if (thumbnailUrl) {
      // If it's an SVG, convert to base64
      if (thumbnailUrl.includes(".svg")) {
        // We'll set this asynchronously later
        // For now, keep the original URL as a fallback
      } else {
        // For other images, normalize the URL
        thumbnailUrl = normalizeThumbnailUrl(thumbnailUrl);
      }
    }

    // Get detailed product information
    const enhancedProduct = await scrapeDetailedProductInfo(product);

    // Process SVG to base64 if needed
    if (thumbnailUrl && thumbnailUrl.includes(".svg")) {
      try {
        const base64Thumbnail = await fetchSvgAsBase64(thumbnailUrl);
        thumbnailUrl = base64Thumbnail;
      } catch (error) {
        console.error(`Error converting SVG to base64: ${error}`);
        // Fall back to the original URL if base64 conversion fails
      }
    }

    // Process gallery images - convert any SVGs to base64
    if (enhancedProduct.galleryImages && enhancedProduct.galleryImages.length > 0) {
      const processedGalleryImages = await Promise.all(
        enhancedProduct.galleryImages.map(async (imgUrl) => {
          if (imgUrl.includes(".svg")) {
            try {
              return await fetchSvgAsBase64(imgUrl);
            } catch (error) {
              console.error(`Error converting gallery SVG to base64: ${error}`);
              return imgUrl; // Fall back to original URL
            }
          }
          return imgUrl;
        }),
      );
      enhancedProduct.galleryImages = processedGalleryImages;
    }

    // Store the original high-quality image from OpenGraph metadata as featuredImage
    const featuredImage = metadata.image || undefined;

    // Make sure we preserve the hunter and makers information
    console.log("Enhanced product hunter:", enhancedProduct.hunter);
    console.log("Enhanced product makers:", enhancedProduct.makers);

    // Before returning the enhanced product, ensure the hunter is not incorrectly in the makers list
    // Only remove the hunter from makers if they weren't EXPLICITLY listed as a maker
    if (enhancedProduct.hunter && enhancedProduct.makers && enhancedProduct.makers.length > 0) {
      const hunterUsername = enhancedProduct.hunter.username;

      // Always filter out the hunter from the makers list unless we're confident they're also a maker
      // This is a key fix to ensure the hunter doesn't show up incorrectly in the makers list
      const explicitlyListedAsMaker = false; // Default assumption: hunter is not a maker unless proven otherwise

      if (!explicitlyListedAsMaker) {
        // If the hunter isn't explicitly listed as a maker, remove them from the makers list
        enhancedProduct.makers = enhancedProduct.makers.filter((maker) => {
          return maker.username !== hunterUsername;
        });

        console.log("Filtered makers list to remove hunter that wasn't explicitly listed as maker");
      } else {
        console.log("Keeping hunter in makers list because they are explicitly listed there");
      }
    }

    // Create the final enhanced product
    const finalProduct = {
      ...enhancedProduct,
      description: metadata.description || product.description,
      thumbnail: thumbnailUrl,
      featuredImage: featuredImage,
      // Ensure hunter and makers are preserved
      hunter: enhancedProduct.hunter || product.hunter,
      makers: enhancedProduct.makers || product.makers,
    };

    console.log("Final product hunter:", finalProduct.hunter);
    console.log("Final product makers:", finalProduct.makers);

    return finalProduct;
  } catch (error) {
    console.error(`Error enhancing product ${product.id} with metadata:`, error);
    return product;
  }
}

// Scrape Open Graph metadata from a URL
export async function scrapeOpenGraphMetadata(url: string): Promise<OpenGraphMetadata> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const metadata: OpenGraphMetadata = {};

    // Extract Open Graph metadata using Cheerio (more reliable than regex)
    metadata.title = $('meta[property="og:title"]').attr("content") || "";
    metadata.description = $('meta[property="og:description"]').attr("content") || "";
    metadata.image = $('meta[property="og:image"]').attr("content") || "";
    metadata.url = $('meta[property="og:url"]').attr("content") || "";
    metadata.siteName = $('meta[property="og:site_name"]').attr("content") || "";
    metadata.type = $('meta[property="og:type"]').attr("content") || "";

    // Extract canonical URL
    metadata.canonicalUrl = $('link[rel="canonical"]').attr("href") || metadata.url || url;

    // If no Open Graph image is found, try other common image selectors
    if (!metadata.image) {
      // Try to find the product image in the page content
      const productImage =
        $(".styles_thumbnail__Xtg_i img").attr("src") ||
        $(".styles_media__jA_aZ img").attr("src") ||
        $('img[alt*="product"]').attr("src") ||
        $('img[alt*="Product"]').attr("src");

      if (productImage) {
        metadata.image = productImage;
      }
    }

    // Ensure image URL is absolute
    if (metadata.image && !metadata.image.startsWith("http")) {
      metadata.image = new URL(metadata.image, url).toString();
    }

    return metadata;
  } catch (error) {
    console.error("Error scraping Open Graph metadata:", error);
    return {};
  }
}

// Get detailed information about a specific product
export async function getProductDetails(productId: string): Promise<{ product?: Product; error?: string }> {
  try {
    const url = `${HOST_URL}posts/${productId}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract canonical URL if available
    const canonicalUrl = $('link[rel="canonical"]').attr("href");

    // Find the Apollo state data embedded in the script tag
    const scriptContent = $('script:contains("ApolloSSRDataTransport")').text();
    const apolloDataMatch = scriptContent.match(/"events":(\[.+\])\}\)/)?.[1];

    if (!apolloDataMatch) {
      throw new Error("Could not extract Apollo data from the page");
    }

    const sanitizedData = sanitizeJsonString(apolloDataMatch);

    if (!sanitizedData) {
      throw new Error("Failed to sanitize Apollo data");
    }

    let apolloData;
    try {
      apolloData = JSON.parse(sanitizedData) as ApolloEvent[];
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error(
        `Failed to parse Apollo data: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
      );
    }

    // Find the post data
    const postEvent = apolloData.find((event) => event.type === "data" && event.result.data.post);

    if (!postEvent || !postEvent.result.data.post) {
      throw new Error("Could not find post data");
    }

    const postData = postEvent.result.data.post;

    // Transform to our Product type
    const product: Product = {
      id: postData.id,
      name: cleanText(postData.name),
      tagline: formatTagline(postData.tagline),
      description: cleanText(postData.description || ""),
      url: canonicalUrl || `${HOST_URL}posts/${postData.slug}`,
      thumbnail: postData.thumbnailImageUuid ? `https://ph-files.imgix.net/${postData.thumbnailImageUuid}` : "",
      votesCount: postData.votesCount || 0,
      commentsCount: postData.commentsCount || 0,
      createdAt: postData.createdAt,
      maker: postData.user
        ? {
            id: postData.user.id,
            name: postData.user.name,
            username: postData.user.username,
            avatarUrl: postData.user.profileImage,
            profileImage: postData.user.profileImage,
          }
        : undefined,
      topics:
        postData.topics?.edges?.map((edge) => ({
          id: edge.node.id,
          name: cleanTopicName(edge.node.name),
          slug: edge.node.slug,
        })) || [],
    };

    // Enhance the product with gallery images and other detailed information
    try {
      const enhancedProduct = await enhanceProductWithMetadata(product);
      return { product: enhancedProduct };
    } catch (enhanceError) {
      console.error("Error enhancing product with metadata:", enhanceError);
      // If enhancement fails, return the basic product
      return { product };
    }
  } catch (error) {
    console.error("Error fetching product details:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Scrape trending products
export async function getTrendingProducts(): Promise<{ products: Product[]; error?: string }> {
  try {
    const response = await fetch(HOST_URL);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find the Apollo state data embedded in the script tag
    const scriptContent = $('script:contains("ApolloSSRDataTransport")').text();
    const apolloDataMatch = scriptContent.match(/"events":(\[.+\])\}\)/)?.[1];

    if (!apolloDataMatch) {
      throw new Error("Could not extract Apollo data from the page");
    }

    const sanitizedData = sanitizeJsonString(apolloDataMatch);

    if (!sanitizedData) {
      throw new Error("Failed to sanitize Apollo data");
    }

    let apolloData;
    try {
      apolloData = JSON.parse(sanitizedData) as ApolloEvent[];
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error(
        `Failed to parse Apollo data: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
      );
    }

    // Find the homefeed data
    const homefeedEvent = apolloData.find((event) => event.type === "data" && event.result.data.homefeed);

    if (!homefeedEvent || !homefeedEvent.result.data.homefeed) {
      throw new Error("Could not find homefeed data");
    }

    // Get the popular products (usually the second section)
    const popularEdge = homefeedEvent.result.data.homefeed.edges.find(
      (edge) => edge.node.id === "FEATURED-1" || edge.node.id === "POPULAR-0",
    );

    if (!popularEdge) {
      throw new Error("Could not find popular products");
    }

    // Extract product data
    const productItems = popularEdge.node.items.filter((item) => item.__typename === "Post");

    // Transform to our Product type
    const products = productItems.map((item) => ({
      id: item.id,
      name: cleanText(item.name),
      tagline: formatTagline(item.tagline),
      description: cleanText(item.description || ""),
      url: `${HOST_URL}posts/${item.slug}`,
      thumbnail: item.thumbnailImageUuid ? `https://ph-files.imgix.net/${item.thumbnailImageUuid}` : "",
      votesCount: item.votesCount || 0,
      commentsCount: item.commentsCount || 0,
      createdAt: item.createdAt,
      maker: item.user
        ? {
            id: item.user.id,
            name: item.user.name,
            username: item.user.username,
            avatarUrl: item.user.profileImage,
            profileImage: item.user.profileImage,
          }
        : undefined,
      topics:
        item.topics?.edges?.map((edge) => ({
          id: edge.node.id,
          name: cleanTopicName(edge.node.name),
          slug: edge.node.slug,
        })) || [],
    }));

    return { products };
  } catch (error) {
    console.error("Error fetching trending products:", error);
    return { products: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Scrape topics
export async function getTopics(): Promise<{ topics: Topic[]; error?: string }> {
  try {
    const response = await fetch(`${HOST_URL}topics`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find the Apollo state data embedded in the script tag
    const scriptContent = $('script:contains("ApolloSSRDataTransport")').text();
    const apolloDataMatch = scriptContent.match(/"events":(\[.+\])\}\)/)?.[1];

    if (!apolloDataMatch) {
      throw new Error("Could not extract Apollo data from the page");
    }

    const sanitizedData = sanitizeJsonString(apolloDataMatch);

    if (!sanitizedData) {
      throw new Error("Failed to sanitize Apollo data");
    }

    let apolloData;
    try {
      apolloData = JSON.parse(sanitizedData) as ApolloEvent[];
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error(
        `Failed to parse Apollo data: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
      );
    }

    // Find the topics data
    const topicsEvent = apolloData.find((event) => event.type === "data" && event.result.data.topics);

    if (!topicsEvent || !topicsEvent.result.data.topics) {
      throw new Error("Could not find topics data");
    }

    // Extract topics
    const topicsEdges = topicsEvent.result.data.topics.edges;

    // Transform to our Topic type
    const topics = topicsEdges.map((edge) => ({
      id: edge.node.id,
      name: cleanTopicName(edge.node.name),
      slug: edge.node.slug,
      description: edge.node.description || "",
      followersCount: edge.node.followersCount || 0,
      postsCount: edge.node.postsCount || 0,
    }));

    return { topics };
  } catch (error) {
    console.error("Error fetching topics:", error);
    return { topics: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Search for products
export async function searchProducts(query: string): Promise<{ products: Product[]; error?: string }> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `${HOST_URL}search?q=${encodedQuery}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find the Apollo state data embedded in the script tag
    const scriptContent = $('script:contains("ApolloSSRDataTransport")').text();
    const apolloDataMatch = scriptContent.match(/"events":(\[.+\])\}\)/)?.[1];

    if (!apolloDataMatch) {
      throw new Error("Could not extract Apollo data from the page");
    }

    const sanitizedData = sanitizeJsonString(apolloDataMatch);

    if (!sanitizedData) {
      throw new Error("Failed to sanitize Apollo data");
    }

    let apolloData;
    try {
      apolloData = JSON.parse(sanitizedData) as ApolloEvent[];
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error(
        `Failed to parse Apollo data: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
      );
    }

    // Find the search results data
    const searchEvent = apolloData.find((event) => event.type === "data" && event.result.data.search);

    if (!searchEvent || !searchEvent.result.data.search) {
      throw new Error("Could not find search results data");
    }

    // Extract product data
    const productItems = searchEvent.result.data.search.edges
      .filter((edge) => edge.node.__typename === "Post")
      .map((edge) => edge.node);

    // Transform to our Product type
    const products = productItems.map((item) => ({
      id: item.id,
      name: cleanText(item.name),
      tagline: formatTagline(item.tagline),
      description: cleanText(item.description || ""),
      url: `${HOST_URL}posts/${item.slug}`,
      thumbnail: item.thumbnailImageUuid ? `https://ph-files.imgix.net/${item.thumbnailImageUuid}` : "",
      votesCount: item.votesCount || 0,
      commentsCount: item.commentsCount || 0,
      createdAt: item.createdAt,
      maker: item.user
        ? {
            id: item.user.id,
            name: item.user.name,
            username: item.user.username,
            avatarUrl: item.user.profileImage,
            profileImage: item.user.profileImage,
          }
        : undefined,
      topics:
        item.topics?.edges?.map((edge) => ({
          id: edge.node.id,
          name: cleanTopicName(edge.node.name),
          slug: edge.node.slug,
        })) || [],
    }));

    return { products };
  } catch (error) {
    console.error("Error searching products:", error);
    return { products: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}
