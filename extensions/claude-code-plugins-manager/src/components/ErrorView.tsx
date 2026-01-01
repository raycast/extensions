/**
 * Error view component for displaying errors
 */

import React from "react";
import { Detail } from "@raycast/api";

interface ErrorViewProps {
  error: Error;
}

export function ErrorView({ error }: ErrorViewProps) {
  const markdown = `
# Error

${error.message}

## Troubleshooting

- Ensure Claude Code CLI is installed: \`npm install -g @anthropic-ai/claude-code\`
- Check that you're authenticated: \`claude auth login\`
- Try updating marketplaces: \`claude plugin marketplace update\`
- Verify Claude is accessible: \`which claude\`

## Error Details

\`\`\`
${error.stack || "No stack trace available"}
\`\`\`
  `;

  return <Detail markdown={markdown} />;
}
