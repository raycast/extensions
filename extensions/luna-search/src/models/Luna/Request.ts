/**
 * Represents the context of a page in the application, including the page type and page ID.
 */
export interface PageContext {
  pageType: string;
  pageId: string;
}

/**
 * Represents the structure of a request to the Luna API.
 * The request includes the following properties:
 * - timeout: The timeout for the request, in seconds.
 * - featureScheme: The feature scheme associated with the request.
 * - pageContext: The context of the page, including the page type and page ID.
 * - clientContext: The context of the client, including the browser metadata.
 */
export interface Request {
  timeout: number;
  featureScheme: string;
  pageContext: PageContext;
  clientContext: {
    browserMetadata: {
      browserType: string;
    };
  };
  serviceToken?: string;
}
