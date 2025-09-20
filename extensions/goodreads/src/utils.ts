import { parse } from "./parser";
import type { Person, Book, BookDetails, PersonDetails, Review } from "./types";

const BOOK_LIST_EXTRACTION_MAP = {
  thumbnail: {
    selector: "img.bookCover",
    value: "src",
  },
  title: {
    selector: "a.bookTitle span",
  },
  author: {
    selector: "a.authorName",
  },
  ratingAndReview: {
    selector: "span.minirating",
  },
  detailsPageUrl: {
    selector: "a.bookTitle",
    value: "href",
  },
};

const SEARCH_PAGE_EXTRACTION_MAP = {
  books: [
    {
      selector: "table tr",
      value: BOOK_LIST_EXTRACTION_MAP,
    },
  ],
};

const DETAILS_PAGE_EXTRACTION_MAP = {
  coverImageSrc: {
    selector: "div.BookCover img",
    value: "src",
  },
  title: {
    selector: "div.BookPageTitleSection h1",
  },
  description: {
    selector: "div.DetailsLayoutRightParagraph span",
    value: "innerHTML",
  },
  featuredDetails: [
    {
      selector: "div.FeaturedDetails p",
    },
  ],
  author: {
    selector: "div.AuthorPreview a.ContributorLink",
  },
  authorDetailsPageUrl: {
    selector: "div.AuthorPreview a.ContributorLink",
    value: "href",
  },
  ratingStatistics: {
    selector: "div.ReviewsSectionStatistics div.RatingStatistics__meta",
  },
  rating: {
    selector: "div.ReviewsSectionStatistics div.RatingStatistics__rating",
  },
  ratingHistogramRows: [
    {
      selector: "div.RatingsHistogram__bar div.RatingsHistogram__labelTotal",
    },
  ],
  genres: [
    {
      selector: "div.BookPageMetadataSection__genres a",
    },
  ],
  reviews: [
    {
      selector: "article.ReviewCard",
      value: {
        reviewerName: {
          selector: "div.ReviewerProfile__name a",
        },
        reviewBody: {
          selector: "section.ReviewText__content span",
        },
        reviewDate: {
          selector: "section.ReviewCard__row span a",
        },
        reviewUrl: {
          selector: "section.ReviewCard__row span a",
          value: "href",
        },
        ratingStars: {
          selector: "section.ReviewCard__row div.ShelfStatus span.RatingStars",
        },
        ratingDeduction: [
          {
            selector: "section.ReviewCard__row div.ShelfStatus use.RatingStar__backgroundFill",
          },
        ],
      },
    },
  ],
};

const PEOPLE_SEARCH_PAGE_EXTRACTION_MAP = {
  authors: [
    {
      selector: "table tr",
      value: {
        thumbnail: { selector: "a img", value: "src" },
        links: [{ selector: "a", value: "href" }],
        texts: [{ selector: "a" }],
      },
    },
  ],
};

const PERSON_DETAILS_PAGE_EXTRACTION_MAP = {
  name: {
    selector: "div.rightContainer h1.authorName span",
  },
  userProfileName: {
    selector: "div.leftContainer h1.userProfileName",
  },
  avatar: {
    selector: "div.authorLeftContainer a img",
    value: "src",
  },
  avatarFallback: {
    selector: "div.leftAlignedProfilePicture a img",
    value: "src",
  },
  privateProfile: {
    selector: 'div[id="privateProfile"]',
  },
  bioDataTitle: [
    {
      selector: "div.rightContainer div.dataTitle",
    },
  ],
  bioDataText: [
    {
      selector: "div.rightContainer div.dataItem a",
    },
  ],
  bioDataLink: [
    {
      selector: "div.rightContainer div.dataItem a",
      value: "href",
    },
  ],
  description: [
    {
      selector: "div.aboutAuthorInfo span",
      value: "innerHTML",
    },
  ],
  rating: {
    selector: "div.hreview-aggregate span.average",
  },
  ratingCount: {
    selector: "div.hreview-aggregate span.votes",
  },
  reviewCount: {
    selector: "div.hreview-aggregate span.count",
  },
};

const GOODREADS_URL_BASE = "https://www.goodreads.com";

const COMMUNITY_REVIEWS_HASH = "#CommunityReviews";

const PERSON_BIO_SECTION = {
  twitter: "Twitter",
  website: "Website",
  genres: "Genre",
};

const extractStatsNumbers = (value: string): string[] => {
  const regex = /[\d.,]+/g;
  const matches = value.match(regex);
  return matches as string[];
};

export const extractEntitiesFromBookSearchPage = (html: string): Book[] => {
  const { books } = parse(SEARCH_PAGE_EXTRACTION_MAP, html);
  const result: Book[] = books.map(createBookFromResponse);

  return result;
};

export const extractEntitiesFromBookDetailsPage = (html: string, url: string): BookDetails => {
  const {
    coverImageSrc,
    title,
    description,
    featuredDetails,
    author,
    authorDetailsPageUrl,
    ratingStatistics,
    rating,
    genres,
    reviews,
    ratingHistogramRows,
  } = parse(DETAILS_PAGE_EXTRACTION_MAP, html);

  const format = featuredDetails[0];
  const published = featuredDetails[1];
  const ratingStats = extractStatsNumbers(ratingStatistics);
  const formattedRatingStatistics = `${ratingStats[0]} ratings · ${ratingStats[1]} reviews`;

  // process reviews
  const processedReviews = reviews.map((reviewItem) => {
    const { reviewBody, reviewDate, reviewerName, reviewUrl, ratingDeduction, ratingStars } = reviewItem;

    const processedReview: Review = { reviewBody, reviewDate, reviewerName, reviewUrl };
    if (ratingStars != undefined && ratingDeduction != undefined) {
      processedReview.rating = 5 - ratingDeduction.length;
    }

    return processedReview;
  });

  // process ratings histogram
  const ratingHistogramProcessed = ratingHistogramRows.map((row) => {
    // histogram row value is in the format: "number (percentage)"
    // Regular expression pattern to match numbers inside and outside parentheses
    const pattern = /([\d,]+)\s*\((?:<*)?([\d.]+)%\)/;

    const matches = row.match(pattern);
    if (matches) {
      const count = matches[1];
      const percentage = parseFloat(matches[2]);
      return { count, percentage };
    }

    return { count: "0", percentage: 0 };
  });

  const communityReviewUrl = `${url}${COMMUNITY_REVIEWS_HASH}`;

  return {
    id: title, // find an alternative
    author,
    authorDetailsPageUrl,
    rating,
    ratingHistogram: ratingHistogramProcessed,
    communityReviewUrl,
    ratingStatistics: formattedRatingStatistics,
    title,
    format,
    published,
    description,
    cover: { source: coverImageSrc },
    url,
    genres,
    reviews: processedReviews,
  };
};

export const extractEntitiesFromPeopleSearchPage = (html: string): Person[] => {
  const { authors } = parse(PEOPLE_SEARCH_PAGE_EXTRACTION_MAP, html);
  const result: Person[] = authors.map((author, index) => {
    const { thumbnail, links, texts } = author;
    const name = texts[1];
    const booksCount = texts[2];
    const friendsCount = texts[3];
    const detailsPage = links[0];

    return {
      id: `${name}-${index}`,
      avatar: thumbnail,
      name,
      booksCount,
      friendsCount,
      contentUrl: { detailsPage },
    };
  });

  return result;
};

export const extractEntitiesFromPersonDetailsPage = (html: string, url: string): PersonDetails => {
  const {
    name,
    userProfileName,
    avatar,
    avatarFallback,
    bioDataText,
    bioDataLink,
    description,
    rating,
    ratingCount,
    reviewCount,
    bioDataTitle,
    privateProfile,
  } = parse(PERSON_DETAILS_PAGE_EXTRACTION_MAP, html);

  const personName = (name || userProfileName)?.trim();

  const result: PersonDetails = {
    id: personName,
    name: personName,
    isProfilePrivate: !!privateProfile,
    avatar: avatar || avatarFallback,
    url,
    description: description[0],
    rating,
    ratingCount: ratingCount?.trim(),
    reviewCount: reviewCount?.trim(),
  };

  // the markup lacks a proper semantic structure
  // so we have to rely on the order of the elements
  const GOODREADS_URL_BASE = "https://www.goodreads.com";
  if (bioDataTitle.includes(PERSON_BIO_SECTION.website)) {
    const index = bioDataTitle.indexOf(PERSON_BIO_SECTION.website);
    result.website = bioDataText[index - 1];
  }
  if (bioDataTitle.includes(PERSON_BIO_SECTION.twitter)) {
    const index = bioDataTitle.indexOf(PERSON_BIO_SECTION.twitter);
    result.twitter = { handle: bioDataText[index - 1], url: bioDataLink[index - 1] };
  }
  if (bioDataTitle.includes(PERSON_BIO_SECTION.genres)) {
    const index = bioDataTitle.indexOf(PERSON_BIO_SECTION.genres);
    result.genres = [
      {
        name: bioDataText[index - 1],
        link: `${GOODREADS_URL_BASE}${bioDataLink[index - 1]}`,
      },
    ];
  }

  return result;
};

interface BookResponse {
  thumbnail: string;
  title: string;
  author: string;
  ratingAndReview: string;
  detailsPageUrl: string;
}

export const getCompleteUrl = (path: string): string => `${GOODREADS_URL_BASE}${path}`;

function createBookFromResponse(data: BookResponse, index: number): Book {
  const { thumbnail, title, author, ratingAndReview, detailsPageUrl } = data;
  const ratingStats = extractStatsNumbers(ratingAndReview);
  const rating = ratingStats?.[0];

  return {
    id: `${title}-${author}-${index}`,
    thumbnail,
    title,
    author,
    rating,
    contentUrl: { detailsPage: detailsPageUrl },
  };
}

/**
 * Converts HTML to CommonMark
 * @param html
 * @returns
 */
export const convertHtmlToCommonMark = (html: string): string => {
  // Replace <br> tags with double newlines (\n\n)
  html = html.replace(/<br\s*\/?>/gi, "\n\n");

  // Replace <i> tags with *...*
  html = html.replace(/<i>(.*?)<\/i>/gi, "*$1*");

  // Replace <b> tags with **...**
  html = html.replace(/<b>/g, "**");
  html = html.replace(/<\/b>/g, "**");

  // Replace <a> tags with [link text](url)
  html = html.replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");

  return html;
};
