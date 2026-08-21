# Raycast AI Tools & OAuth Integration

Raycast provides native AI integration and an OAuth 2.0 PKCE client service for seamless third-party authentication.

---

## 1. Raycast AI API

Extensions can invoke Raycast AI models directly for text generation, translation, summaries, and smart transformations.

### Streaming Completions with `AI.ask`:
```tsx
import { AI, showToast, Toast } from "@raycast/api";

export async function summarizeTicket(description: string): Promise<string> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Summarizing with AI..." });
  
  const stream = AI.ask(`Provide a 3-bullet concise summary of this issue:\n\n${description}`, {
    model: AI.Model["OpenAI_GPT4o-mini"],
    creativity: "low"
  });

  let fullResponse = "";
  stream.on("data", (chunk) => {
    fullResponse += chunk;
  });

  await stream;
  toast.style = Toast.Style.Success;
  toast.title = "Summary ready";

  return fullResponse;
}
```

### React Hook: `useAI` from `@raycast/utils`:
```tsx
import { useAI } from "@raycast/utils";

export function AssistantView({ codeSnippet }: { codeSnippet: string }) {
  const { data, isLoading, revalidate } = useAI(
    `Explain what this code does in 2 sentences:\n\`\`\`${codeSnippet}\`\`\``
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={data || "Waiting for explanation..."}
    />
  );
}
```

---

## 2. Raycast AI Tools for Chat

Raycast allows extensions to publish AI tools that the Raycast AI assistant can call during chat sessions.

### Step 1: Declare Tool in `package.json`
```json
"tools": [
  {
    "name": "lookup-customer",
    "title": "Lookup Customer",
    "description": "Find customer contact info and active subscriptions by email or domain",
    "params": {
      "email": {
        "type": "string",
        "description": "Customer email address",
        "required": true
      }
    }
  }
]
```

### Step 2: Implement Tool Handler in `src/tools/lookup-customer.ts`
```typescript
interface Input {
  email: string;
}

interface CustomerRecord {
  name: string;
  plan: string;
  active: boolean;
  mrr: number;
}

export default async function (input: Input): Promise<CustomerRecord> {
  const response = await fetch(`https://api.crm.internal/customers?email=${encodeURIComponent(input.email)}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` }
  });

  if (!response.ok) {
    throw new Error(`Customer lookup failed with status: ${response.status}`);
  }

  const data = await response.json();
  return {
    name: data.full_name,
    plan: data.subscription_plan,
    active: data.status === "active",
    mrr: data.monthly_recurring_revenue
  };
}
```

---

## 3. OAuth 2.0 PKCE Flow with `@raycast/utils`

Raycast extensions should use `OAuthService` from `@raycast/utils` to implement secure, zero-secret OAuth authorization flows with PKCE.

### Complete OAuth Client Implementation:

```tsx
import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "GitHub",
  providerIcon: "github-icon.png",
  description: "Connect your GitHub account to manage pull requests and issues."
});

export const oauthService = new OAuthService({
  client,
  clientId: "CLIENT_ID_FROM_PROVIDER",
  authorizeUrl: "https://github.com/login/oauth/authorize",
  tokenUrl: "https://github.com/login/oauth/access_token",
  scope: "read:user repo",
  onAuthorize({ token }) {
    console.log("OAuth authorization successful");
  }
});

// Authenticated fetch wrapper:
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = await oauthService.getTokens();
  if (!token?.accessToken) {
    throw new Error("User not authenticated");
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json"
    }
  });
}
```

### Authenticated View Pattern:
```tsx
import { withAccessToken } from "@raycast/utils";

function MyPrivateCommand() {
  return <List>...</List>;
}

export default withAccessToken(oauthService)(MyPrivateCommand);
```
