# ADR: Integrating Outline Wiki Search in Raycast Extension

## Context

Outline is a popular wiki and knowledge base platform used by many organizations. To improve
productivity and ease of access, we want to integrate Outline search functionality into a Raycast
extension. This will allow users to quickly search and access their Outline documents directly from
Raycast.

## Decision

We will create a Raycast extension that integrates with the Outline API to provide search
functionality for Outline documents. The extension will allow users to search their Outline
instance and view search results directly within Raycast.

## Technical Details

### API Endpoints

- Search Endpoint: POST /documents.search
  - Request format: JSON
  - Parameters:
    * query: Search query string
    * limit: Number of results to return (e.g., 25)
    * offset: Pagination offset
  - Response format: JSON
    * data: Array of search result objects
    * pagination: Object containing offset and limit

### Search Result Object Structure

```json
{
  "id": string,
  "url": string,
  "title": string,
  "text": string,
  "document": {
    "id": string,
    "url": string,
    "title": string,
    "text": string
  }
}
```

### New Feature: Collection-based Search Filtering

To enhance the search functionality, we will allow users to filter their search results by
selecting a specific collection. This will provide more targeted and relevant search results.

#### Collections Endpoint

- Collections Endpoint: POST /collections.list
  - Request format: JSON
  - Parameters:
    * limit: Number of collections to return (e.g., 25)
  - Response format: JSON
    * data: Array of collection objects
    * pagination: Object containing offset and limit

#### Collection Object Structure

```json
{
  "id": string,
  "name": string,
  "description": string,
  "sort": {
    "field": string,
    "direction": string
  },
  "index": string,
  "color": string,
  "icon": string,
  "permission": string,
  "createdAt": string (ISO 8601 date),
  "updatedAt": string (ISO 8601 date),
  "deletedAt": string (ISO 8601 date) | null
}
```

#### Updated Search Endpoint

- Search Endpoint (updated): POST /documents.search
  - New parameter: `collectionId` (optional)

## Requirements

1. User Authentication:
   - Implement secure storage for the user's Outline API token.
   - Use the stored API token for all requests to the Outline API.

2. Search Functionality:
   - Implement a search input field in the Raycast extension.
   - Send search queries to the Outline API using the stored API token.
   - Display search results in a list format within Raycast.

3. Result Display:
   - Show the document title and a snippet of the content in the search results.
   - Provide an option to open the full document in the default web browser.

4. Error Handling:
   - Implement proper error handling for API requests.
   - Display user-friendly error messages in case of connection issues or API errors.

5. Collection Querying:
   - Implement a function to fetch collections from the Outline API using the POST
/collections.list endpoint.
   - Handle pagination using the provided pagination object in the response.
   - Store relevant collection data, primarily `id` and `name`, for use in the UI and search
queries.
   - Implement error handling for collection fetching.

6. User Interface Updates:
   - Add a dropdown or list for collection selection before the search input.
   - Display collection names to the user, using the `name` field from the collection object.
   - Use the `id` field when passing the selected collection to the search query.
   - Include an "All Collections" option as the default.
   - Consider using the `color` field to enhance the visual representation of collections in the
UI.

7. Search Functionality Update:
   - Modify the search function to include the selected collection `id` in the API request.
   - Update the `useSearchDocuments` hook to accept an optional `collectionId` parameter.

8. Performance Considerations:
   - Implement caching for the collections list to minimize API calls.
   - Implement pagination or lazy loading for collections, utilizing the pagination object in the
API response.

## Implementation Steps

1. Set up the basic Raycast extension structure.
2. Implement secure storage for the Outline API token.
3. Create the main search command and UI components.
4. Implement the search functionality using the Outline API.
5. Add error handling and user-friendly error messages.
6. Implement result display and the option to open documents in a browser.
7. Test the extension thoroughly with various search queries and edge cases.
8. Update the API module to include a function for fetching collections using the POST
/collections.list endpoint.
9. Implement pagination logic for fetching all collections, using the pagination object in the
response.
10. Create interfaces or types for the collection and pagination objects.
11. Implement a new React component for collection selection, considering how to handle a
potentially large number of collections.
12. Modify the search command to incorporate collection selection.
13. Update the `useSearchDocuments` hook to handle the optional `collectionId`.
14. Implement caching for the collections list.
15. Update error handling to account for collection-related errors.
16. Update tests to cover the new functionality, including pagination of collections.
17. Update user documentation to explain the new feature and any limitations related to the number
of collections.

## Consequences

### Positive

- Users can quickly search their Outline documents directly from Raycast.
- The extension provides a seamless integration between Raycast and Outline.
- Users can filter search results by collection, improving search relevance.

### Negative

- The extension requires users to provide an API token, which may be a security concern for some
users.
- The extension's functionality is dependent on the Outline API, so any API changes or downtime
will affect the extension.

### Risks

- If the Outline API changes, the extension may need to be updated to maintain compatibility.
- Large Outline instances with many documents may experience slower search performance.
- Organizations with a large number of collections may need to implement additional UI
considerations for collection selection.

## Alternatives Considered

1. Creating a web-based search interface: This was rejected as it wouldn't provide the same level
of integration and quick access that Raycast offers.
2. Using Outline's built-in search functionality: While this is a viable option, integrating the
search into Raycast provides a more streamlined workflow for users who frequently use Raycast.
3. Implementing local indexing of Outline documents: This was considered to potentially improve
search speed, but was rejected due to the complexity of implementation and potential
synchronization issues.

## References

- Outline API Documentation:
[https://www.getoutline.com/developers](https://www.getoutline.com/developers)
- Raycast Extensions API: [https://developers.raycast.com](https://developers.raycast.com
