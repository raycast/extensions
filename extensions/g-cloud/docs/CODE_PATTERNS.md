# Code Patterns

This document outlines the key code patterns used throughout the G-Cloud project. Reference this document when implementing new features to maintain consistency.

## Service Structure

### Service Class Pattern

Services follow a consistent class-based pattern:

```typescript
export class ServiceName {
  private gcloudPath: string;
  private projectId: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds cache TTL

  constructor(gcloudPath: string, projectId: string) {
    this.gcloudPath = gcloudPath;
    this.projectId = projectId;
  }

  // Methods for interacting with the service
}
```

### Interface Definitions

- Define clear interfaces for all data structures
- Place interfaces at the top of the service file
- Use descriptive names that match Google Cloud terminology

```typescript
export interface ResourceType {
  id: string;
  name: string;
  // Other properties
}
```

### Caching Strategy

- Implement caching for expensive API calls
- Use a Map with TTL for cache invalidation
- Include cache key generation based on resource parameters

```typescript
async getResource(resourceId: string): Promise<Resource> {
  const cacheKey = `resource:${resourceId}`;
  const cachedData = this.cache.get(cacheKey);
  const now = Date.now();
  
  if (cachedData && (now - cachedData.timestamp < this.CACHE_TTL)) {
    return cachedData.data;
  }
  
  // Fetch data and update cache
}
```

## Component Structure

### Component Organization

- Break down large components into smaller, focused components
- Place reusable components in a `components` directory within each service
- Export components from an `index.ts` file

```typescript
// src/services/iam/components/index.ts
export { default as IAMPrincipalList } from './IAMPrincipalList';
export { default as IAMPrincipalDetail } from './IAMPrincipalDetail';
export { default as IAMRoleForm } from './IAMRoleForm';
```

### Component Props

- Define clear interfaces for component props
- Use descriptive prop names
- Include callback functions for component interactions

```typescript
interface ComponentProps {
  data: DataType[];
  isLoading: boolean;
  onItemSelected: (item: DataType) => void;
  onRefresh: () => void;
}
```

### Component State Management

- Keep state as close as possible to where it's used
- Use `useState` for simple state management
- Use `useMemo` for computed values
- Use `useCallback` for event handlers

```typescript
const [isLoading, setIsLoading] = useState(true);
const [data, setData] = useState<DataType[]>([]);

// Computed value with useMemo
const filteredData = useMemo(() => {
  return data.filter(item => item.name.includes(searchText));
}, [data, searchText]);

// Event handler with useCallback
const handleItemSelected = useCallback((item: DataType) => {
  // Handle selection
}, []);
```

### Component Size Limits

- Keep components under 200 lines of code
- Extract complex logic into separate functions or hooks
- Use composition to build complex UIs from simple components

## Error Handling

- Use try/catch blocks for all async operations
- Provide meaningful error messages
- Log errors to console for debugging
- Propagate errors to UI for user feedback

```typescript
try {
  // Operation
} catch (error) {
  console.error("Error description:", error);
  throw new Error(`Failed to perform operation: ${error.message}`);
}
```

## Command Execution

- Use the `executeGcloudCommand` utility for all gcloud operations
- Properly escape parameters and handle command output
- Parse JSON responses with error handling

```typescript
const result = await executeGcloudCommand(
  this.gcloudPath,
  ["command", "subcommand", `--project=${this.projectId}`, "--format=json"],
  { timeout: 30000 }
);
```

## Utility Functions

- Place reusable functions in the `src/utils` directory
- Create specialized utility files for different domains (FileUtils, etc.)
- Document utility functions with JSDoc comments

```typescript
/**
 * Description of what the function does
 * @param paramName Description of the parameter
 * @returns Description of the return value
 */
export function utilityFunction(param: ParamType): ReturnType {
  // Implementation
}
``` 