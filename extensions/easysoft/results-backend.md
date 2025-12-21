# Results Backend Documentation

This document provides comprehensive documentation for the Assessment Results backend API endpoints and related functionality.

## Overview

The Results backend is responsible for fetching and displaying detailed assessment results for published tests and assignments from SchoolSoft. It identifies subjects with published results (`resultReportStatus === 'REPORTED'`) and progressively loads detailed assessment data.

The system:
1. **Identifies Published Results**: Filters subjects to find those with published assessment results
2. **Progressive Loading**: Loads detailed assessment data in batches to improve performance
3. **Caching**: Caches loaded assessments by subject ID to avoid redundant API calls

## API Endpoints

### GET `/api/assessment/[id]`

Fetches detailed assessment data for a specific test/assignment. This endpoint is shared with the Upcoming Tests backend but is used in the Results context to display published assessment results.

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
  // Typically includes: id, title, subTitle, description, type, endDate, etc.
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

**Usage in Results Context:**
- Called progressively for subjects with `resultReportStatus === 'REPORTED'`
- Provides detailed grade breakdowns, comments, and assessment criteria
- Loaded in batches of 3 to avoid overwhelming the API
- Assessment IDs are extracted from subject IDs (numeric portion before the hyphen)

## Frontend Integration

### Data Flow

1. **Subject Filtering**: Identifies subjects with published results:
   ```typescript
   const publishedResults = subjects.filter(
     (subject) => subject.resultReportStatus === 'REPORTED'
   );
   ```

2. **Progressive Assessment Loading**: Loads detailed assessment data in batches:
   ```typescript
   loadItemsInBatches(
     publishedResults,
     async (subject) => {
       const numericId = subject.id.split('-')[0];
       try {
         const response = await fetch(`/api/assessment/${numericId}`);
         if (!response.ok) return null;
         return (await response.json()) as AssessmentData;
       } catch (error) {
         console.error('Error loading assessment:', error);
         return null;
       }
     },
     (results) => {
       setLoadedAssessments((prev) => ({ ...prev, ...results }));
     }
   );
   ```

3. **Caching**: Loaded assessments are cached by subject ID to avoid redundant requests

### Published Results Logic

The `getPublishedSubjects()` function filters and sorts published results:

```3:10:app/lib/views/resultsViewLogic.ts
export function getPublishedSubjects(subjects: Subject[]): Subject[] {
  return subjects
    .filter((subject) => subject.resultReportStatus === 'REPORTED')
    .sort((a, b) => {
      if (!a.endDate || !b.endDate) return 0;
      return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
    });
}
```

**Filtering Criteria:**
- `resultReportStatus` must equal `"REPORTED"`
- Results are sorted by `endDate` in descending order (most recent first)

### Progressive Loading Strategy

Assessment details are loaded progressively to improve initial page load:

1. **Batch Size**: 3 assessments per batch
2. **Loading Trigger**: Only loads for subjects with `resultReportStatus === 'REPORTED'`
3. **Caching**: Loaded assessments are cached by subject ID to avoid redundant requests
4. **Error Handling**: Failed requests return `null` and don't block other assessments

**Implementation:**

```175:204:app/lib/hooks/useSchoolSoftData.ts
  // Progressive loading of assessments and subject details
  useEffect(() => {
    if (loading || !subjects || subjects.length === 0) {
      return;
    }

    // Load assessment data for published results
    const publishedResults = subjects.filter(
      (subject) => subject.resultReportStatus === 'REPORTED'
    );

    if (publishedResults.length > 0) {
      loadItemsInBatches(
        publishedResults,
        async (subject) => {
          const numericId = subject.id.split('-')[0];
          try {
            const response = await fetch(`/api/assessment/${numericId}`);
            if (!response.ok) return null;
            return (await response.json()) as AssessmentData;
          } catch (error) {
            console.error('Error loading assessment:', error);
            return null;
          }
        },
        (results) => {
          setLoadedAssessments((prev) => ({ ...prev, ...results }));
        }
      );
    }
```

## Authentication

All assessment endpoints require a valid SchoolSoft session cookie (`JSESSIONID`). The session is obtained through the login process (see [Login Backend Documentation](./login-backend.md)).

The `getSessionIdFromRequest()` helper extracts the session ID from:
1. Request cookies (`JSESSIONID` cookie)
2. Fallback: `X-Session-Cookie` header

## Headers Configuration

The assessment endpoint uses `getSchoolsoftHeaders()` to construct proper headers for SchoolSoft API requests:

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
4. **Progressive Loading Errors**: Failed assessment requests return `null` and don't block other assessments

## SchoolSoft Integration

### Assessment Endpoint

- **URL**: `https://sms.schoolsoft.se/engelska/rest-api/student/ps/assignment/{id}/assessment`
- **Method**: GET
- **Headers**: Standard SchoolSoft REST API headers (see Headers Configuration)
- **Response**: JSON assessment data

## Data Flow Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. Filter subjects
       │    (resultReportStatus === 'REPORTED')
       ▼
┌─────────────────────────┐
│  Published Subjects     │
│  (sorted by endDate)    │
└──────┬──────────────────┘
       │
       │ 2. Load assessments in batches (3 at a time)
       │    GET /api/assessment/[id]
       ▼
┌─────────────────────────┐
│  Assessment Endpoint    │
└──────┬──────────────────┘
       │
       │ 3. Extract numeric ID from subject ID
       │    (subject.id.split('-')[0])
       │
       │ 4. Fetch from SchoolSoft REST API
       ▼
┌─────────────────────────┐
│  SchoolSoft REST API    │
│  (assessment endpoint)  │
└──────┬──────────────────┘
       │
       │ 5. Return assessment data
       ▼
┌─────────────────────────┐
│  Loaded Assessments     │
│  (cached by subject ID) │
└─────────────────────────┘
```

## Subject ID to Assessment ID Conversion

Assessment IDs are extracted from subject IDs using a simple string split:

```typescript
const numericId = subject.id.split('-')[0];
```

**Example:**
- Subject ID: `"12345-67890"`
- Assessment ID: `"12345"`

This extracts the numeric portion before the hyphen, which is used as the assessment ID for the API call.

## Limitations and Considerations

1. **Progressive Loading**: Assessment details load progressively, which means they may not be immediately available when the page first renders.

2. **Batch Size**: Fixed batch size of 3 may not be optimal for all scenarios. Consider making it configurable.

3. **Error Recovery**: Failed assessment requests return `null` and don't block other assessments. This provides graceful degradation but may hide issues.

4. **No Retry Logic**: Failed requests are not automatically retried. Consider implementing retry logic for transient failures.

5. **Cache Management**: Assessments are cached indefinitely. Consider implementing cache expiration or invalidation strategies.

## Recommendations for Production

1. **Implement Caching**: Cache assessment data at the API layer to reduce SchoolSoft API calls
2. **Add Retry Logic**: Implement automatic retry for transient failures
3. **Error Monitoring**: Track assessment loading failures and success rates
4. **Batch Size Configuration**: Make batch size configurable based on network conditions
5. **Cache Expiration**: Implement cache expiration to ensure data freshness
6. **Loading States**: Provide clear loading indicators for progressive assessment loading

## Notes

- Assessment results are only loaded for subjects with `resultReportStatus === 'REPORTED'`
- Assessment IDs are extracted from subject IDs (numeric portion before the hyphen)
- The backend acts as a proxy to SchoolSoft's REST API
- All requests require a valid authenticated session
- Loaded assessments are cached by subject ID to avoid redundant API calls
- Progressive loading improves initial page load time while still providing detailed assessment data
