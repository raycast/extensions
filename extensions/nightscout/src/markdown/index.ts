const accessDeniedMarkdown = `
# Access Denied

Your access token appears to be invalid or doesn't have sufficient permissions.

## What to check
- Your token is correct
- The token has the **'readable'** role assigned
  - If you tried to add treatments, **'careportal'** role is also needed
- Your Nightscout instance is configured properly

## Next steps
1. Visit your Nightscout instance admin panel
2. Check your API token permissions
3. Update the token in extension preferences if needed`;

const tokenRequiredMarkdown = `
# Access Token Required

Your Nightscout instance requires an access token to view glucose data.

## How to get your token
1. Sign in to your Nightscout instance
2. Go to **Admin Tools** → **Subjects - People, Devices, etc**
3. Create a subject with **'readable'** role (if you want to add treatments, also assign the **'careportal'** role)
4. Copy the access token and add it to extension preferences

You can press use the action below to open the preferences directly.

## Need help?
Check your Nightscout documentation for API token setup.`;

const getConnectionErrorMarkdown = (errorMessage: string) => `
# Connection Error

Unable to connect to your Nightscout instance.

## Error Details
\`\`\`
${errorMessage}
\`\`\`

## Troubleshooting
- Check your Nightscout URL is correct
- Ensure your Nightscout instance is online
- Verify your network connection`;

const getInvalidUrlMarkdown = (url: string) => `
# Invalid Nightscout URL

The provided Nightscout instance URL appears to be invalid.

## Current URL
\`\`\`
${url}
\`\`\`

## What to check
- URL should start with \`https://\` or \`http://\`
- URL should include your Nightscout domain
- Example: \`https://yourname.herokuapp.com\`

## Next steps
1. Update your Nightscout URL in extension preferences
2. Ensure the URL is accessible in your browser`;

const getNotFoundMarkdown = () => `
# Nightscout API Not Found

The Nightscout API endpoint was not found (404 error).

## Possible causes
- Your Nightscout instance is not properly configured
- The API endpoints are disabled
- Your Nightscout version doesn't support the API
- The URL path is incorrect

## Troubleshooting
1. Verify your Nightscout instance works in a browser
2. Check that your instance has API access enabled
3. Ensure you're using a recent version of Nightscout
4. Try accessing \`[your-instance]/api/v1/entries\` directly`;

const getDataValidationMarkdown = () => `
# Invalid Data Format

The data received from your Nightscout instance doesn't match the expected format.

## Possible causes
- Your Nightscout instance returned unexpected data
- API version mismatch
- Database corruption or incomplete data

## Troubleshooting
1. Check your Nightscout instance in a browser
2. Verify recent glucose readings are showing correctly
3. Try refreshing the extension
4. Contact your Nightscout administrator if the issue persists`;

const getRateLimitMarkdown = () => `
# Rate Limit Exceeded

Too many requests have been made to your Nightscout instance.

## What happened
Your Nightscout instance (or host) is limiting API requests

## Next steps
1. Wait a few minutes before trying again
2. Check if other apps are also accessing your Nightscout data
3. Consider reducing refresh frequency if this happens often`;

const getPreferencesValidationMarkdown = (errors: string[]) => `
# Configuration Error

There are issues with your extension preferences that need to be fixed.

## Problems found
${errors.map((error) => `- ${error}`).join("\n")}

## Next steps
1. Open extension preferences using the action below
2. Fix the configuration issues listed above
3. Try again once the settings are corrected`;

export {
  accessDeniedMarkdown,
  tokenRequiredMarkdown,
  getConnectionErrorMarkdown,
  getInvalidUrlMarkdown,
  getNotFoundMarkdown,
  getDataValidationMarkdown,
  getRateLimitMarkdown,
  getPreferencesValidationMarkdown,
};
