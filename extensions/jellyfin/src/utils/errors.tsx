/**
 * Extracts the error message from an unknown error-like object
 * @param error The error to get the message from
 * @returns the error message as a string
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export const ErrStatus400 = `# Error 😖

The server returned status \` 400 \` (that's not good!).

This error indicates that most likely something went wrong with your **User ID**.

## How to obtain the User ID

1. Go to your \`Administrator Dashboard\` -> \`Users\` -> Select your user
2. The URL of this page should look like this: https://jellyfin.example/web/index.html#!/useredit.html?userId=6ca1985577a843fd9949d811f6af9248
3. Copy the User ID from the URL (the part after \`userId\` -> \`6ca1985577a843fd9949d811f6af9248\`) 
and update it in the extension's preferences (\`Cmd\` + \`Enter\`)

## Didn't work?

If you're sure you got the right User ID, please submit an issue.`;

export const ErrStatus401 = `# Error 😖

The server returned status \` 401 \` (that's not good!).

This error indicates that most likely something went wrong with your **API Key**.

## How to obtain an API Key

1. Go to your \`Administrator Dashboard\` -> \`API Keys\` -> And click on the button with the plus \` [+] \`
2. You can give the API Key a name, like \`Raycast\`
3. Copy the API Token 
and update it in the extension's preferences (\`Cmd\` + \`Enter\`)

## Didn't work?

If you're sure you got the right API Token, please submit an issue.`;
