# Upcoming Tests Backend Documentation

This document provides comprehensive documentation for the Upcoming Tests backend API endpoints and related functionality.

## Overview

The Upcoming Tests backend is responsible for fetching and managing test/assessment data from SchoolSoft. Tests are identified as subjects with type `"Checkpoint"` or `"Assessment"` that have an end date on or after today.

## API Endpoints

### GET `/api/assessment/[id]`

Fetches detailed assessment data for a specific test/assignment.

#### Parameters

- `id` (path parameter, required): The numeric ID of the assessment/assignment

#### Request Headers

- `Cookie: JSESSIONID=<session_id>` (required): SchoolSoft session cookie
- `User-Agent`: Client user agent (optional, defaults to Mozilla/5.0)

#### Response

**Success (200 OK):**
```json
{
  // Assessment data object with various properties
  // Structure depends on SchoolSoft API response
}
```

**Error Responses:**

- `401 Unauthorized`: No session cookie provided
- `500 Internal Server Error`: Failed to fetch assessment from SchoolSoft

#### Implementation Details

The endpoint:
1. Extracts the session ID from the request cookies using `getSessionIdFromRequest()`
2. Validates that a session exists
3. Makes a GET request to SchoolSoft's REST API: `https://sms.schoolsoft.se/engelska/rest-api/student/ps/assignment/${id}/assessment`
4. Uses `getSchoolsoftHeaders()` to construct proper headers including the session cookie
5. Returns the assessment data as JSON

#### Code Reference

```9:55:app/api/assessment/[id]/route.ts
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Get the session cookie
    const sessionId = getSessionIdFromRequest(request);
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Unauthorized - No session cookie provided' },
        { status: 401 }
      );
    }

    const response = await fetch(
      `https://sms.schoolsoft.se/engelska/rest-api/student/ps/assignment/${id}/assessment`,
      {
        method: 'GET',
        headers: getSchoolsoftHeaders(sessionId, request.headers.get('user-agent')),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch assessment: ${response.status} ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    const data = (await response.json()) as AssessmentData;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching assessment:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch assessment',
      },
      { status: 500 }
    );
  }
}
```

### GET `/api/assignments/[id]`

Fetches assignment details for a specific assignment ID.

#### Parameters

- `id` (path parameter, required): The numeric ID of the assignment

#### Request Headers

- `Cookie: JSESSIONID=<session_id>` (required): SchoolSoft session cookie
- `User-Agent`: Client user agent (optional)

#### Response

**Success (200 OK):**
```json
{
  "id": number,
  "title": string,
  "subTitle": string,
  "description": string,
  "type": string,
  "publishDate": string,
  "integrationType": string | null,
  // ... other properties
}
```

**Error Responses:**

- `401 Unauthorized`: No session cookie provided
- `500 Internal Server Error`: Failed to fetch assignment

#### Implementation Details

Similar to the assessment endpoint, this fetches assignment data from:
`https://sms.schoolsoft.se/engelska/rest-api/student/ps/assignments/${id}/view`

## Frontend Integration

### Data Flow

1. **Initial Load**: The frontend fetches all subjects from `/api/subjects`
2. **Test Filtering**: Tests are filtered client-side using `getUpcomingTests()` function
3. **Progressive Loading**: Assessment details are loaded progressively for tests with published results

### Test Filtering Logic

Tests are identified and filtered using the `getUpcomingTests()` function:

```3:16:app/lib/views/testsViewLogic.ts
export function getUpcomingTests(subjects: Subject[], today: Date): Subject[] {
  const normalizedToday = new Date(today);
  normalizedToday.setHours(0, 0, 0, 0);

  const filteredTests = subjects.filter(
    (subject) => subject.type === 'Checkpoint' || subject.type === 'Assessment',
  );

  return filteredTests.filter((test) => {
    if (!test.endDate) return true;
    const endDate = new Date(test.endDate);
    return endDate >= normalizedToday;
  });
}
```

**Filtering Criteria:**
- Subject type must be `"Checkpoint"` or `"Assessment"`
- If `endDate` exists, it must be today or in the future
- Tests without an `endDate` are included by default

### Date Formatting

The `formatDaysUntilTest()` function formats test dates for display:

```18:36:app/lib/views/testsViewLogic.ts
export function formatDaysUntilTest(dateString: string): string {
  const testDate = new Date(dateString);
  const today = new Date();

  // Normalize to start of day for accurate day difference
  testDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = testDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Tomorrow";
  } else {
    return `In ${diffDays} days`;
  }
}
```

## Authentication

All assessment and assignment endpoints require a valid SchoolSoft session cookie (`JSESSIONID`). The session is obtained through the login process (see Login Backend Documentation).

The `getSessionIdFromRequest()` helper extracts the session ID from:
1. Request cookies (`JSESSIONID` cookie)
2. Fallback: `X-Session-Cookie` header

```54:60:app/api/utils/headers.ts
export function getSessionIdFromRequest(request: NextRequest): string | null {
  const cookie = request.cookies.get('JSESSIONID');
  if (cookie?.value) {
    return cookie.value;
  }
  return request.headers.get('X-Session-Cookie');
}
```

## Headers Configuration

The backend uses `getSchoolsoftHeaders()` to construct proper headers for SchoolSoft API requests:

```8:26:app/api/utils/headers.ts
export function getSchoolsoftHeaders(
  sessionId: string,
  clientUserAgent?: string | null
): Record<string, string> {
  return {
    'User-Agent': clientUserAgent || 'Mozilla/5.0',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Referer': 'https://sms.schoolsoft.se/engelska/react/',
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

## Progressive Loading Strategy

The frontend implements a progressive loading strategy for assessment data:

1. Initially loads all subjects (which includes test metadata)
2. Filters tests client-side
3. Loads assessment details in batches (3 at a time) for tests with `resultReportStatus === 'REPORTED'`
4. Caches loaded assessments to avoid redundant API calls

This approach improves initial page load time while still providing detailed assessment data when needed.

## SchoolSoft API Endpoints Used

- **Assessment Data**: `https://sms.schoolsoft.se/engelska/rest-api/student/ps/assignment/{id}/assessment`
- **Assignment Details**: `https://sms.schoolsoft.se/engelska/rest-api/student/ps/assignments/{id}/view`
- **Subjects List**: `https://sms.schoolsoft.se/engelska/rest-api/student/ps/assignments` (used by `/api/subjects`)

## Notes

- Assessment IDs are extracted from subject IDs (numeric portion before the hyphen)
- The backend acts as a proxy to SchoolSoft's REST API
- All requests require a valid authenticated session
- Error responses maintain the same structure for consistent client-side handling

