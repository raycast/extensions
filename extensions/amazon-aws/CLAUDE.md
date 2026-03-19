# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Raycast extension** for AWS that provides quick access to AWS resources and services directly from Raycast. It uses the AWS SDK v3 for TypeScript and the Raycast API.

## Common Commands

```bash
npm run dev          # Start development mode (watches for changes)
npm run build        # Build for production
npm run lint         # Run linting
npm run fix-lint     # Auto-fix linting issues
```

## Architecture

### Entry Points

Each AWS service has a dedicated entry point in `src/`. New commands must be registered in `package.json` under the `commands` array.

### Hooks Pattern

All AWS API calls are wrapped in custom hooks (`src/hooks/use-*.ts`) using `useCachedPromise` from `@raycast/utils`:

- Hooks handle pagination automatically with recursive fetching
- Toast notifications show loading progress
- Use `isReadyToFetch()` from `src/util/index.ts` to check if AWS credentials are available

Example pattern:

```typescript
export function useAmplifyApps() {
  const { data, error, isLoading, revalidate } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading..." });
      return await fetchAmplifyApps(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "Failed to load" } },
  );
  return { apps: data, error, isLoading: (!data && !error) || isLoading, revalidate };
}
```

### AWS Client Factory

Each AWS service has a dedicated client module in `src/services/clients/` for tree-shaking. Import only the client you need:

```typescript
import { getAmplifyClient } from "../services/clients/amplify";

const client = getAmplifyClient(); // Returns cached AmplifyClient
const response = await client.send(new ListAppsCommand({}));
```

Clients are cached per profile/region combination via the shared `ClientCache` in `src/services/client-cache.ts`.

### AWS Profile Management

The `AWSProfileDropdown` component (`src/components/searchbar/aws-profile-dropdown.tsx`):

- Reads AWS profiles from `~/.aws/config` and `~/.aws/credentials`
- Supports AWS Vault integration (configured via extension preferences)
- Supports AWS SSO with automatic SSO login URL generation
- Sets environment variables: `AWS_PROFILE`, `AWS_REGION`, `AWS_SSO_*`

### Console Links

`resourceToConsoleLink()` in `src/util/index.ts` generates AWS Console URLs for different resource types. When adding a new resource type, add a case to this switch statement.

### Common Actions

`AwsAction` class in `src/components/common/action.tsx`:

- `AwsAction.Console` - Opens resource in AWS Console (with SSO support)
- `AwsAction.ExportResponse` - Copies raw AWS API response
- `AwsAction.SwitchResourceType` - For views with multiple resource types

### AI Tools

The extension includes Raycast AI tools (`package.json` → `tools` array) for natural language interaction with AWS resources. Each tool has a corresponding implementation in `src/tools/`. Tools are standalone functions that export a default async function.

### Error Handling

Custom error types are available in `src/errors/index.ts`:

- `AWSClientError` - For AWS API failures
- `ValidationError` - For input validation failures
- `ResourceNotFoundError` - For missing resources
- Use `getAWSErrorMessage()` to extract user-friendly messages

## Constants

- `AWS_URL_BASE` in `src/constants.ts` - Base URL for AWS Console links
- Region is read from `process.env.AWS_REGION` (set by profile dropdown)

## Environment Variables Used

- `AWS_PROFILE` - Selected AWS profile name
- `AWS_REGION` - AWS region for API calls and console links
- `AWS_VAULT` - Set when using AWS Vault
- `AWS_SSO_START_URL`, `AWS_SSO_ACCOUNT_ID`, `AWS_SSO_ROLE_NAME` - For SSO integration
