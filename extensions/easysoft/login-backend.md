# Login Backend Documentation

This document provides comprehensive documentation for the Login and Authentication backend API endpoints.

## Overview

The Login backend handles user authentication with SchoolSoft, manages session cookies, and provides CSRF protection. It acts as a credential proxy to SchoolSoft's legacy login form, extracting session cookies for use in subsequent API requests.

## Security Considerations

⚠️ **IMPORTANT**: The current implementation is a temporary workaround and has security limitations:

- Direct credential handling (should use proper OAuth/SAML)
- Depends on SchoolSoft's HTML form structure and cookie format
- No true MFA/security delegation
- Credentials are sent to SchoolSoft via this proxy (trust/compliance risk)

**Recommended for Production:**
- Use SchoolSoft's official OAuth/SAML provider (if available)
- Implement proper SSO/OIDC patterns
- Never handle raw credentials directly
- Use service account flows with credential rotation & encryption

## API Endpoints

### POST `/api/auth/login`

Authenticates a user with SchoolSoft credentials and establishes a session.

#### Request Body

```json
{
  "username": "string",
  "password": "string"
}
```

#### Request Headers

- `X-CSRF-Token` (required): CSRF token matching the `csrf_token` cookie
- `Cookie: csrf_token=<token>` (required): CSRF token cookie
- Standard browser headers (User-Agent, Accept, etc.) are forwarded to SchoolSoft

#### Response

**Success (200 OK):**
```json
{
  "success": true
}
```

Sets an HttpOnly cookie: `JSESSIONID=<session_id>`

**Error Responses:**

- `400 Bad Request`: Missing username or password
- `403 Forbidden`: Invalid CSRF token
- `401 Unauthorized`: Login failed (invalid credentials)
- `500 Internal Server Error`: Server error or failed to extract session

#### Implementation Details

The login endpoint:

1. **CSRF Protection**: Validates CSRF token from header against cookie
2. **Credential Validation**: Ensures username and password are provided
3. **SchoolSoft Login**: POSTs credentials to SchoolSoft's legacy login form:
   - URL: `https://sms.schoolsoft.se/engelska/jsp/Login.jsp`
   - Method: POST
   - Content-Type: `application/x-www-form-urlencoded`
   - Parameters: `action=login`, `usertype=1`, `ssusername`, `sspassword`, `button=Login`
4. **Session Extraction**: Extracts `JSESSIONID` from the `Set-Cookie` header
5. **Cookie Setting**: Sets `JSESSIONID` as an HttpOnly, Secure (in production), SameSite=Strict cookie
6. **Redirect Handling**: Uses `redirect: 'manual'` to intercept 302 redirects and read headers

#### Code Reference

```35:152:app/api/auth/login/route.ts
export async function POST(request: NextRequest) {
  try {
    const csrfHeader = request.headers.get('X-CSRF-Token');
    const csrfCookie = request.cookies.get('csrf_token');

    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie.value) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Missing username or password' },
        { status: 400 }
      );
    }

    const params = new URLSearchParams();
    params.append('action', 'login');
    params.append('usertype', '1');
    params.append('ssusername', username);
    params.append('sspassword', password);
    params.append('button', 'Login');

    const headers = new Headers();
    headers.set('content-type', 'application/x-www-form-urlencoded');
    headers.set('Referer', 'https://sms.schoolsoft.se/engelska/jsp/Login.jsp?usertype=1');
    
    // Forward relevant headers from the client request to mimic their machine
    const headerKeysToForward = [
      'user-agent',
      'accept',
      'accept-language',
      'sec-ch-ua',
      'sec-ch-ua-mobile',
      'sec-ch-ua-platform',
      'sec-fetch-dest',
      'sec-fetch-mode',
      'sec-fetch-site',
      'sec-fetch-user',
      'upgrade-insecure-requests'
    ];

    headerKeysToForward.forEach(key => {
      const value = request.headers.get(key);
      if (value) {
        headers.set(key, value);
      }
    });

    const response = await fetch('https://sms.schoolsoft.se/engelska/jsp/Login.jsp', {
      method: 'POST',
      headers: headers,
      body: params,
      redirect: 'manual' // Important to catch the 302 redirect and read headers
    });

    // SchoolSoft usually redirects after login. We need to check Set-Cookie headers.
    const setCookieHeader = response.headers.get('set-cookie');

    if (!setCookieHeader) {
      // If no cookie is set, login might have failed or the format is different
       // Check if we got a 200 OK which might indicate the login page was returned (failure)
       // or 302 Found (success redirect)
      if (response.status === 200) {
          return NextResponse.json(
              { error: 'Login failed. Please check your credentials.' },
              { status: 401 }
          );
      }
      return NextResponse.json(
        { error: 'No session cookie received from SchoolSoft' },
        { status: 500 }
      );
    }

    // Extract JSESSIONID
    // Format is typically: JSESSIONID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX; Path=/...
    const match = setCookieHeader.match(/JSESSIONID=([^;]+)/);
    
    if (match && match[1]) {
      const jsessionId = match[1];
      
      // Create response with success indicator
      const jsonResponse = NextResponse.json({ success: true });
      
      // Set HttpOnly cookie
      jsonResponse.cookies.set({
        name: 'JSESSIONID',
        value: jsessionId,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 // 1 day
      });
      
      return jsonResponse;
    }

    return NextResponse.json(
      { error: 'Could not extract JSESSIONID from response' },
      { status: 500 }
    );

  } catch (error) {
    console.error('[LOGIN] Error processing login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### POST `/api/auth/logout`

Logs out the current user by clearing the session cookie.

#### Request

No body or parameters required.

#### Response

**Success (200 OK):**
```json
{
  "success": true
}
```

Clears the `JSESSIONID` cookie by setting it to empty with `maxAge: 0`.

#### Code Reference

```3:18:app/api/auth/logout/route.ts
export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear the JSESSIONID cookie
  response.cookies.set({
    name: 'JSESSIONID',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0 // Expire immediately
  });

  return response;
}
```

### POST `/api/auth/set-session`

Sets a session cookie from a provided JSESSIONID. Includes validation to ensure the session is valid before setting.

#### Request Body

```json
{
  "jsessionId": "string"
}
```

#### Response

**Success (200 OK):**
```json
{
  "success": true
}
```

Sets the `JSESSIONID` cookie if validation succeeds.

**Error Responses:**

- `400 Bad Request`: Missing jsessionId
- `401 Unauthorized`: Invalid or expired session
- `500 Internal Server Error`: Server error

#### Implementation Details

This endpoint:
1. Validates that `jsessionId` is provided
2. **Verifies Session**: Makes a lightweight request to SchoolSoft to verify the session is valid:
   - Endpoint: `https://sms.schoolsoft.se/engelska/api/user/profile`
   - Uses the provided JSESSIONID in the Cookie header
3. **Sets Cookie**: Only sets the cookie if verification succeeds
4. **Security**: Prevents setting invalid/expired sessions

#### Code Reference

```3:52:app/api/auth/set-session/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jsessionId } = body;

    if (!jsessionId) {
      return NextResponse.json(
        { error: 'Missing jsessionId' },
        { status: 400 }
      );
    }

    // VERIFY SESSION BEFORE SETTING
    // We make a lightweight request to SchoolSoft to check if the session is valid.
    // Ideally use an endpoint that returns 200 for valid sessions and 401/403 for invalid ones.
    const verifyResponse = await fetch('https://sms.schoolsoft.se/engelska/api/user/profile', {
      headers: { 
        'Cookie': `JSESSIONID=${jsessionId}`,
        'User-Agent': 'Mozilla/5.0' // Some endpoints require UA
      }
    });

    // Note: If /user/profile isn't the right endpoint, we might need to find another lightweight one.
    // But assuming strict security, if this fails, we shouldn't set the cookie.
    if (!verifyResponse.ok) {
       console.warn(`[SET-SESSION] Blocked attempt to set invalid session: ${jsessionId.substring(0, 5)}...`);
       return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: 'JSESSIONID',
      value: jsessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return response;
  } catch (error) {
    console.error('[SET-SESSION] Error setting session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### GET `/api/auth/csrf`

Generates and returns a CSRF token for use in login requests.

#### Response

**Success (200 OK):**
```json
{
  "csrfToken": "uuid-string"
}
```

Sets an HttpOnly cookie: `csrf_token=<token>`

#### Implementation Details

- Generates a UUID using `crypto.randomUUID()`
- Returns the token in the JSON response
- Sets the token as an HttpOnly cookie for validation
- Cookie is Secure in production, SameSite=Strict

#### Code Reference

```3:18:app/api/auth/csrf/route.ts
export async function GET() {
  const csrfToken = crypto.randomUUID();

  const response = NextResponse.json({ csrfToken });

  response.cookies.set({
    name: 'csrf_token',
    value: csrfToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  return response;
}
```

## Session Management

### Session Cookie Properties

The `JSESSIONID` cookie is configured with:

- **HttpOnly**: `true` - Prevents JavaScript access (XSS protection)
- **Secure**: `true` in production - Only sent over HTTPS
- **SameSite**: `strict` - Prevents CSRF attacks
- **Path**: `/` - Available site-wide
- **MaxAge**: `86400` seconds (24 hours)

### Session Validation

Sessions are validated in two ways:

1. **On Login**: SchoolSoft validates credentials and issues a session cookie
2. **On Set-Session**: The backend verifies the session is valid before accepting it

## CSRF Protection

The login endpoint implements CSRF protection:

1. Client requests CSRF token from `/api/auth/csrf`
2. Server generates UUID and sets it as an HttpOnly cookie
3. Client includes the token in `X-CSRF-Token` header for login
4. Server validates header token matches cookie token
5. Request is rejected if tokens don't match

This prevents cross-site request forgery attacks.

## Frontend Integration

### Login Flow

1. **Get CSRF Token**: `GET /api/auth/csrf`
2. **Login**: `POST /api/auth/login` with credentials and CSRF token
3. **Session Established**: `JSESSIONID` cookie is set automatically
4. **Use Session**: Subsequent API requests include the cookie automatically

### Alternative: Popup Login

The codebase also includes a popup-based login flow (`openSchoolsoftLoginWindow`) that:
- Opens SchoolSoft's SAML login page in a popup
- Uses `postMessage` to communicate session back to parent window
- Calls `/api/auth/set-session` to establish the session

This is documented as a temporary workaround in `app/lib/auth/sessionLogic.ts`.

## Error Handling

All endpoints implement comprehensive error handling:

- **Validation Errors**: Returns 400/403 with descriptive messages
- **Authentication Errors**: Returns 401 for failed logins or invalid sessions
- **Server Errors**: Catches exceptions, logs errors, returns 500

## SchoolSoft Integration

### Login Endpoint

- **URL**: `https://sms.schoolsoft.se/engelska/jsp/Login.jsp`
- **Method**: POST
- **Content-Type**: `application/x-www-form-urlencoded`
- **Parameters**:
  - `action`: `"login"`
  - `usertype`: `"1"` (student)
  - `ssusername`: Username
  - `sspassword`: Password
  - `button`: `"Login"`

### Session Verification Endpoint

- **URL**: `https://sms.schoolsoft.se/engelska/api/user/profile`
- **Method**: GET
- **Headers**: `Cookie: JSESSIONID=<session_id>`

## Security Best Practices

1. **CSRF Protection**: Always validate CSRF tokens for state-changing operations
2. **HttpOnly Cookies**: Session cookies are HttpOnly to prevent XSS attacks
3. **Secure Cookies**: Use Secure flag in production (HTTPS only)
4. **SameSite**: Strict SameSite policy prevents CSRF
5. **Session Validation**: Verify sessions before accepting them
6. **Error Messages**: Don't leak sensitive information in error responses

## Notes

- The current implementation is a temporary workaround for SchoolSoft integration
- Production deployments should migrate to proper OAuth/SAML flows
- Session cookies expire after 24 hours
- All authentication endpoints require proper CORS configuration if used cross-origin
- The backend forwards browser headers to SchoolSoft to mimic legitimate requests

