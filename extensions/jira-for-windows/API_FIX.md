# API Fix - 410 Error Resolution

## Problem
The extension was failing with a **410 error** (Gone) indicating that the API endpoint was removed or deprecated:
```
Jira API error (410): {"errorMessages":["The requested API has been removed. Please migrate to the /rest/api/...
```

## Root Cause
The issue was caused by:
1. Using `/project/search` endpoint which may have been deprecated
2. Using Jira REST API v3 (`/rest/api/3`) which has different stability across endpoints

## Solution Implemented

### Changes Made to `src/jira-api.ts`

1. **Changed endpoint from `/project/search` to `/project`**
   - The `/project` endpoint is more stable and widely supported
   - Returns all projects the user has access to

2. **Added API version flexibility**
   - Updated `getBaseUrl()` to accept version parameter
   - Updated `request()` method to accept `apiVersion` parameter (defaults to 3)
   - Can now call endpoints with either API v2 or v3

3. **Migrated endpoints to appropriate API versions**
   - **API v2** for basic CRUD operations (more stable):
     - `getProjects()` - tries v2 first, falls back to v3
     - `getPriorities()` - uses v2
     - `getIssueTypes()` - uses v2
     - `createIssue()` - uses v2
   - **API v3** for search operations (required by Jira):
     - `getMyIssues()` - uses v3 with `/search/jql` endpoint
     - `getExistingLabels()` - uses v3 with `/search/jql` endpoint

4. **Updated search endpoint** ⚠️ CRITICAL FIX
   - Changed from `/rest/api/2/search` to `/rest/api/3/search/jql`
   - The old `/search` endpoint returned 410 (Gone)
   - New endpoint follows Jira's migration requirement

5. **Enhanced error logging**
   - Added console.log for request URLs
   - Added detailed error messages with endpoint info
   - Better debugging information

## Testing the Fix

After these changes, try:

1. **Test Review Tasks Command**
   ```
   Open Raycast → Type "Review Tasks"
   ```
   - Should load your assigned tasks without errors
   - Check terminal/console for log messages

2. **Test Create Task Command**
   ```
   Open Raycast → Type "Create Task"
   ```
   - Should load projects, priorities, and issue types
   - Check terminal for successful API calls

3. **Check Console Logs**
   When running `npm run dev`, you should see:
   ```
   Making request to: https://your-domain.atlassian.net/rest/api/2/project
   Making request to: https://your-domain.atlassian.net/rest/api/2/priority
   ```

## What to Look For

### Success Indicators
✅ Console shows successful requests  
✅ Projects list loads in Create Task  
✅ Tasks list loads in Review Tasks  
✅ No 410 errors  

### If Still Failing

1. **Check your console output** - look for the actual URLs being called
2. **Verify your credentials** in Raycast preferences:
   - Jira Domain (without https://)
   - Email address
   - API Token (not expired)

3. **Test API manually** using curl:
   ```bash
   curl -u "your-email@company.com:your-api-token" \
     "https://your-domain.atlassian.net/rest/api/2/project"
   ```

4. **Check API token permissions**:
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Verify token exists and is valid
   - May need to regenerate token

## API Version Compatibility

| Endpoint | API v2 | API v3 | Used In Extension |
|----------|--------|--------|-------------------|
| `/project` | ✅ Stable | ⚠️ Sometimes fails | v2 (with v3 fallback) |
| `/priority` | ✅ Stable | ✅ Stable | v2 |
| `/issue` | ✅ Stable | ✅ Stable | v2 |
| `/search` | ❌ **REMOVED (410)** | ⚠️ Use `/search/jql` | - |
| `/search/jql` | ❌ Not available | ✅ **Required** | v3 |

## References

- [Jira REST API v2 Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v2/)
- [Jira REST API v3 Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Jira Authentication Documentation](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/)

## Next Steps

1. Run `npm run dev` to test the extension
2. Check the console output for API call logs
3. Test both Create Task and Review Tasks commands
4. If issues persist, check the console for specific error messages and update this document

## Rollback (If Needed)

If this causes issues, you can revert by:
1. Changing all `2` back to `3` in the apiVersion parameters
2. Or using git to revert: `git checkout src/jira-api.ts`

## Notes

- API v2 is generally more stable for basic operations
- API v3 has newer features but may have compatibility issues
- The extension now logs all API calls for easier debugging
- Error messages include the full endpoint path for troubleshooting

