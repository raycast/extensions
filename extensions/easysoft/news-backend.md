# News Backend Documentation

This document provides comprehensive documentation for the News backend API endpoints and related functionality.

## Overview

The News backend is responsible for fetching and displaying school announcements and news items from SchoolSoft. It fetches an HTML page containing news items in an accordion format, then parses the HTML client-side to extract structured news data including titles, content, dates, metadata, and attachments.

The system:
1. **Fetches News HTML**: Retrieves the news page from SchoolSoft's JSP endpoint
2. **Character Encoding**: Handles ISO-8859-1 (Latin1) encoding conversion to UTF-8
3. **HTML Parsing**: Parses accordion-group elements to extract structured news items
4. **Client-Side Processing**: Parsing happens in the browser using DOMParser

## API Endpoints

### GET `/api/news`

Fetches the HTML news page from SchoolSoft containing school announcements and news items.

#### Request Headers

- `Cookie: JSESSIONID=<session_id>` (required): SchoolSoft session cookie
- `User-Agent`: Client user agent (optional, defaults to Mozilla/5.0)

#### Response

**Success (200 OK):**
```json
{
  "html": "<html>...</html>"
}
```

The HTML contains accordion-group elements with news items, each containing:
- Title, preview text, date
- Full content (HTML)
- Metadata (From, To, Published, Show to, audience flags)
- File attachments

**Error Responses:**

- `401 Unauthorized`: No session cookie provided
- `500 Internal Server Error`: Failed to fetch news page from SchoolSoft

#### Implementation Details

The endpoint:
1. Extracts the session ID from request cookies using `getSessionIdFromRequest()`
2. Validates that a session exists
3. Makes a GET request to SchoolSoft's JSP page: `https://sms.schoolsoft.se/engelska/jsp/student/right_student_news.jsp`
4. Uses `getStudentHeadersForStartpage()` to construct proper headers including the session cookie
5. **Character Encoding**: Handles ISO-8859-1 (Latin1) encoding by:
   - Reading response as ArrayBuffer
   - Converting to Buffer
   - Decoding from Latin1 to UTF-8 using `iconv-lite`
6. Returns the decoded HTML as JSON

#### Code Reference

```10:65:app/api/news/route.ts
export async function GET(request: NextRequest) {
  try {
    // Get the session cookie
    const sessionId = getSessionIdFromRequest(request);

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Unauthorized - No session cookie provided' },
        { status: 401 },
      );
    }

    const response = await fetch(
      'https://sms.schoolsoft.se/engelska/jsp/student/right_student_news.jsp',
      {
        method: 'GET',
        headers: getStudentHeadersForStartpage(
          sessionId,
          request.headers.get('user-agent'),
        ),
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch news page: ${response.status} ${response.statusText}`,
        },
        { status: response.status },
      );
    }

    // Decode ISO-8859-1 response properly
    // Get raw bytes as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Decode from ISO-8859-1 (latin1) to UTF-8
    const html = iconv.decode(buffer, 'latin1');

    const payload: NewsHtmlResponse = { html };
    
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching news page:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch news page',
      },
      { status: 500 },
    );
  }
}
```

## HTML Parsing

### Overview

⚠️ **WORKAROUND (Temporary Integration)**: The system currently scrapes HTML using DOM selectors to extract news data. This is fragile and couples the client to SchoolSoft's HTML structure.

**Recommended for Production:**
- Replace with a proper JSON API endpoint
- Move HTML parsing to the backend
- Return clean structured data to the frontend
- Enables caching at the API layer
- Centralizes parsing logic (easier to maintain if SchoolSoft updates their page)

### Data Structure

The parsed news data follows this structure:

```typescript
interface NewsAttachment {
  name: string;      // File name
  url: string;       // Download URL
  size?: string;     // File size (e.g., "92 KB")
}

interface NewsMetadata {
  from?: string;         // Sender
  to?: string;           // Recipient
  published?: string;    // Publication date
  showTo?: string;       // Display audience
  toTeacher?: boolean;   // Visible to teachers
  toStudent?: boolean;   // Visible to students
  toParent?: boolean;    // Visible to parents
}

interface NewsItem {
  id: string;              // News item ID (e.g., "316783")
  title: string;           // News title
  preview: string;          // Preview text
  date: string;             // Publication date
  content: string;          // Full HTML content
  metadata: NewsMetadata;   // Metadata object
  attachments: NewsAttachment[]; // File attachments
}
```

### Parsing Logic

The `parseNewsHtml()` function extracts structured data from the HTML:

```41:218:app/lib/views/newsViewLogic.ts
export function parseNewsHtml(html: string): NewsItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Find all accordion groups
  const accordionGroups = Array.from(
    doc.querySelectorAll<HTMLDivElement>('.accordion-group'),
  );

  const newsItems: NewsItem[] = accordionGroups
    .map((group): NewsItem | null => {
      // Extract ID from accordion-group ID (e.g., "accordion-group316783" -> "316783")
      const groupId = group.id.replace('accordion-group', '');
      if (!groupId) {
        return null;
      }

      // Extract title from <span id='name{id}'>
      const titleElement = doc.querySelector<HTMLSpanElement>(
        `span#name${groupId}`,
      );
      const title = titleElement?.textContent?.trim() || '';

      // Extract preview from .preview-block
      const previewElement = group.querySelector<HTMLDivElement>(
        '.preview-block',
      );
      const preview = previewElement?.textContent?.trim() || '';

      // Extract date from .accordion-heading-date-wide
      const dateElement = group.querySelector<HTMLDivElement>(
        '.accordion-heading-date-wide',
      );
      const date = dateElement?.textContent?.trim() || '';

      // Extract content from <span id='description{id}'>
      // Try searching within the group's accordion-inner section first
      let contentElement = group.querySelector<HTMLSpanElement>(
        `span#description${groupId}`,
      );
      
      // If not found in group, try the entire document
      if (!contentElement) {
        contentElement = doc.querySelector<HTMLSpanElement>(
          `span#description${groupId}`,
        );
      }
      
      let content = contentElement?.innerHTML || '';
      
      if (contentElement && !content) {
        const parent = contentElement.parentElement;
        
        // Fix: Invalid HTML (p > span > p) causes parser to close the outer p.
        // The content becomes a sibling of the p.acc-item-main.
        if (parent && parent.classList.contains('acc-item-main')) {
             let gatheredContent = '';
             let nextNode = parent.nextElementSibling;
             
             // Collect all following siblings that look like content (e.g. p tags)
             // Stop if we hit the form or another structure
             while (nextNode && nextNode.tagName !== 'FORM' && !nextNode.classList.contains('accordion_inner_right')) {
                 gatheredContent += nextNode.outerHTML;
                 nextNode = nextNode.nextElementSibling;
             }
             
             if (gatheredContent) {
                 content = gatheredContent;
             }
        }
      }

      // Extract metadata from .accordion_inner_right
      const metadataElement = group.querySelector<HTMLDivElement>(
        '.accordion_inner_right',
      );
      const metadata: NewsMetadata = {};

      if (metadataElement) {
        // Extract "From" - look for label "From" followed by div
        const fromLabel = Array.from(
          metadataElement.querySelectorAll<HTMLLabelElement>('label'),
        ).find((label) => label.textContent?.trim() === 'From');
        if (fromLabel?.nextElementSibling) {
          metadata.from = fromLabel.nextElementSibling.textContent?.trim();
        }

        // Extract "To"
        const toLabel = Array.from(
          metadataElement.querySelectorAll<HTMLLabelElement>('label'),
        ).find((label) => label.textContent?.trim() === 'To');
        if (toLabel?.nextElementSibling) {
          metadata.to = toLabel.nextElementSibling.textContent?.trim();
        }

        // Extract "Published"
        const publishedLabel = Array.from(
          metadataElement.querySelectorAll<HTMLLabelElement>('label'),
        ).find((label) => label.textContent?.trim() === 'Published');
        if (publishedLabel?.nextElementSibling) {
          metadata.published = publishedLabel.nextElementSibling.textContent?.trim();
        }

        // Extract "Show to"
        const showToLabel = Array.from(
          metadataElement.querySelectorAll<HTMLLabelElement>('label'),
        ).find((label) => label.textContent?.trim() === 'Show to');
        if (showToLabel?.nextElementSibling) {
          metadata.showTo = showToLabel.nextElementSibling.textContent?.trim();
        }

        // Extract toTeacher, toStudent, toParent from hidden divs
        const toTeacherElement = metadataElement.querySelector<HTMLDivElement>(
          `#toTeacher${groupId}`,
        );
        metadata.toTeacher =
          toTeacherElement?.textContent?.trim() === '1' || false;

        const toStudentElement = metadataElement.querySelector<HTMLDivElement>(
          `#toStudent${groupId}`,
        );
        metadata.toStudent =
          toStudentElement?.textContent?.trim() === '1' || false;

        const toParentElement = metadataElement.querySelector<HTMLDivElement>(
          `#toParent${groupId}`,
        );
        metadata.toParent =
          toParentElement?.textContent?.trim() === '1' || false;
      }

      // Extract attachments from #fileAttach{id}
      const attachments: NewsAttachment[] = [];
      const fileAttachElement = doc.querySelector<HTMLDivElement>(
        `#fileAttach${groupId}`,
      );
      if (fileAttachElement) {
        const fileLinks = Array.from(
          fileAttachElement.querySelectorAll<HTMLAnchorElement>('a'),
        );
        fileLinks.forEach((link) => {
          const url = link.getAttribute('href') || '';
          const name = link.textContent?.trim() || '';
          // Try to extract size from parent div (e.g., "(92 KB)")
          const sizeMatch = link.parentElement?.textContent?.match(
            /\(([^)]+)\)/,
          );
          const size = sizeMatch ? sizeMatch[1] : undefined;

          if (url && name) {
            attachments.push({ name, url, size });
          }
        });
      }

      // Only return item if it has at least a title
      if (!title) {
        return null;
      }

      return {
        id: groupId,
        title,
        preview,
        date,
        content,
        metadata,
        attachments,
      };
    })
    .filter((item): item is NewsItem => item !== null);

  return newsItems;
}
```

**Parsing Steps:**

1. **Accordion Group Extraction**: Finds all `.accordion-group` elements
2. **ID Extraction**: Extracts news item ID from accordion-group ID (e.g., `"accordion-group316783"` → `"316783"`)
3. **Title Extraction**: Gets title from `<span id='name{id}'>`
4. **Preview Extraction**: Gets preview text from `.preview-block` div
5. **Date Extraction**: Gets date from `.accordion-heading-date-wide` div
6. **Content Extraction**: Gets HTML content from `<span id='description{id}'>`
   - Handles malformed HTML where content becomes a sibling due to invalid nesting
   - Collects following sibling elements if content is empty
7. **Metadata Extraction**: Parses metadata from `.accordion_inner_right`:
   - From, To, Published, Show to (from label/value pairs)
   - Audience flags (`toTeacher`, `toStudent`, `toParent`) from hidden divs
8. **Attachments Extraction**: Parses file attachments from `#fileAttach{id}`:
   - Extracts file name, URL, and size (if available)
9. **Filtering**: Only returns items with at least a title

**HTML Structure Expected:**

```html
<div class="accordion-group" id="accordion-group316783">
  <div class="accordion-heading">
    <span id="name316783">News Title</span>
    <div class="accordion-heading-date-wide">2024-01-15</div>
  </div>
  <div class="preview-block">Preview text...</div>
  <div class="accordion-inner">
    <p class="acc-item-main">
      <span id="description316783">Full HTML content...</span>
    </p>
    <div class="accordion_inner_right">
      <label>From</label>
      <div>Sender Name</div>
      <label>Published</label>
      <div>2024-01-15</div>
      <div id="toStudent316783">1</div>
    </div>
    <div id="fileAttach316783">
      <a href="/file.pdf">document.pdf (92 KB)</a>
    </div>
  </div>
</div>
```

## Character Encoding

The news endpoint handles ISO-8859-1 (Latin1) encoding conversion:

**Why it's needed:**
- SchoolSoft's news page returns content in ISO-8859-1 encoding
- JavaScript/Node.js expects UTF-8 by default
- Without conversion, special characters (Swedish characters like å, ä, ö) display incorrectly

**Implementation:**
1. Response is read as `ArrayBuffer` to get raw bytes
2. Converted to Node.js `Buffer`
3. Decoded from Latin1 to UTF-8 using `iconv-lite` library

```typescript
const arrayBuffer = await response.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);
const html = iconv.decode(buffer, 'latin1');
```

## Frontend Integration

### Data Flow

1. **Fetch News HTML**: Client requests news page:
   ```typescript
   const response = await fetch("/api/news");
   const data = await response.json();
   ```

2. **HTML Parsing**: Parses HTML client-side using `parseNewsHtml()`:
   ```typescript
   if (!data.html) {
     throw new Error("Invalid response format");
   }
   const parsedItems = parseNewsHtml(data.html);
   setNewsItems(parsedItems);
   ```

3. **Display**: News items are displayed in the UI with expandable cards showing preview, full content, metadata, and attachments

### Implementation Example

```20:53:app/components/home/views/NewsView.tsx
  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/news");

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Unauthorized - Please log in");
          }
          throw new Error(`Failed to fetch news: ${response.status}`);
        }

        const data = await response.json();
        if (!data.html) {
          throw new Error("Invalid response format");
        }

        const parsedItems = parseNewsHtml(data.html);
        setNewsItems(parsedItems);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch news"
        );
        setNewsItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);
```

## Authentication

The news endpoint requires a valid SchoolSoft session cookie (`JSESSIONID`). The session is obtained through the login process (see [Login Backend Documentation](./login-backend.md)).

The `getSessionIdFromRequest()` helper extracts the session ID from:
1. Request cookies (`JSESSIONID` cookie)
2. Fallback: `X-Session-Cookie` header

## Headers Configuration

The news endpoint uses `getStudentHeadersForStartpage()` to construct proper headers:

```31:49:app/api/utils/headers.ts
export function getStudentHeadersForStartpage(
  sessionId: string,
  clientUserAgent?: string | null
): Record<string, string> {
  return {
    'User-Agent': clientUserAgent || 'Mozilla/5.0',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Referer': 'https://sms.schoolsoft.se/engelska/jsp/student/right_student_startpage.jsp',
    'Sec-GPC': '1',
    'Connection': 'keep-alive',
    'Cookie': `JSESSIONID=${sessionId}`,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Priority': 'u=4',
  };
}
```

## Error Handling

All endpoints implement comprehensive error handling:

1. **Authentication Errors**: Returns 401 if no session is provided
2. **SchoolSoft API Errors**: Forwards the status code and error message from SchoolSoft
3. **Network/Server Errors**: Catches exceptions and returns 500 with error details
4. **Parsing Errors**: Returns empty array if HTML parsing fails (graceful degradation)
5. **Invalid Response**: Validates that HTML is present in response

## SchoolSoft Integration

### News Page Endpoint

- **URL**: `https://sms.schoolsoft.se/engelska/jsp/student/right_student_news.jsp`
- **Method**: GET
- **Headers**: Requires `JSESSIONID` cookie and specific Referer header
- **Response**: HTML page with accordion-group elements (ISO-8859-1 encoded)

## Data Flow Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. GET /api/news
       ▼
┌─────────────────────────┐
│  News HTML Endpoint     │
└──────┬──────────────────┘
       │
       │ 2. Fetch HTML from SchoolSoft
       ▼
┌─────────────────────────┐
│    SchoolSoft JSP       │
│  (right_student_news.jsp)│
└──────┬──────────────────┘
       │
       │ 3. Return HTML (ISO-8859-1)
       ▼
┌─────────────────────────┐
│  Character Encoding     │
│  (Latin1 → UTF-8)       │
└──────┬──────────────────┘
       │
       │ 4. Return decoded HTML
       ▼
┌─────────────────────────┐
│   Client (Browser)      │
│  parseNewsHtml()        │
└──────┬──────────────────┘
       │
       │ 5. Extract structured data
       │    - Accordion groups
       │    - Titles, previews, dates
       │    - Content (HTML)
       │    - Metadata
       │    - Attachments
       ▼
┌─────────────────────────┐
│    NewsItem[]           │
│  (structured news data)  │
└─────────────────────────┘
```

## Limitations and Considerations

1. **HTML Parsing Fragility**: The HTML parsing depends on specific CSS classes and HTML structure. Changes to SchoolSoft's HTML will break parsing.

2. **Client-Side Parsing**: HTML parsing happens in the browser, requiring DOMParser. This adds client-side processing overhead.

3. **Malformed HTML Handling**: The parser includes workarounds for invalid HTML nesting (p > span > p), which adds complexity.

4. **No Caching**: News HTML is fetched on every page load. Consider implementing caching for better performance.

5. **Character Encoding**: Requires `iconv-lite` dependency for proper encoding conversion.

6. **Error Recovery**: If HTML parsing fails, the system returns an empty array rather than showing an error. This provides graceful degradation but may hide issues.

## Recommendations for Production

1. **Move Parsing to Backend**: Parse HTML on the server and return structured JSON
2. **Implement Caching**: Cache parsed news data to reduce API calls
3. **Add Error Monitoring**: Track parsing failures and HTML structure changes
4. **Use REST API**: If SchoolSoft provides a REST API for news, migrate to it
5. **Structured Error Responses**: Return detailed error information when parsing fails
6. **Content Sanitization**: Sanitize HTML content before displaying to prevent XSS attacks
7. **Pagination**: Consider implementing pagination if news items become numerous

## Notes

- News HTML is fetched on-demand when the News view is accessed
- The parser handles malformed HTML by collecting sibling elements
- Character encoding conversion is critical for proper display of Swedish characters
- Attachments are extracted with file size information when available
- Metadata includes audience flags (toTeacher, toStudent, toParent) for filtering
- Only news items with titles are returned (items without titles are filtered out)

