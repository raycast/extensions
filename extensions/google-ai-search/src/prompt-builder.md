# Prompt Builder Documentation

The PromptBuilder class provides a flexible, composable way to generate prompts for the Google AI Search extension.

## Basic Usage

### Using Convenience Methods (Recommended)

```typescript
// Weather prompt
const weatherPrompt = PromptBuilder.buildWeatherPrompt("Agoura Hills", addressComponents);

// Address prompt
const addressPrompt = PromptBuilder.buildAddressPrompt("1028 pleasant view ave", sources);

// General prompt
const generalPrompt = PromptBuilder.buildGeneralPrompt(
  "best laptop for programming",
  sources,
  userLocation,
  shouldPrioritizeLocal,
);
```

### Using Builder Pattern

```typescript
const prompt = new PromptBuilder()
  .addGeneralQuery("best restaurants", userLocation)
  .addSources(sources)
  .addGeneralInstructions(true) // prioritize local results
  .build();
```

## Advanced Usage

### Custom Weather Query

```typescript
const customWeatherPrompt = new PromptBuilder()
  .addWeatherQuery("San Francisco", {
    city: "San Francisco",
    state: "CA",
    latitude: 37.7749,
    longitude: -122.4194,
  })
  .addWeatherInstructions()
  .build();
```

### Mixed Context Prompt

```typescript
const complexPrompt = new PromptBuilder()
  .addQuery("Find Italian restaurants")
  .addLocationContext(userLocation)
  .addSources(sources)
  .addGeneralInstructions(true)
  .build();
```

## Available Methods

### Query Methods

- `addQuery(query)` - Generic query header
- `addWeatherQuery(location, addressComponents?)` - Weather-specific query
- `addAddressQuery(query)` - Address lookup query
- `addGeneralQuery(query, userLocation?)` - General search query

### Context Methods

- `addSources(sources)` - Add numbered source citations
- `addLocationContext(location)` - Add user location context

### Instruction Methods

- `addWeatherInstructions()` - JSON weather response format
- `addAddressInstructions()` - Address/place details format
- `addGeneralInstructions(prioritizeLocal?)` - General AI overview format

### Building

- `build()` - Combine all sections into final prompt

## Adding New Prompt Types

To add a new prompt type:

1. Add query method:

```typescript
addProductQuery(productName: string): PromptBuilder {
  this.sections.push(`Find detailed information about: "${productName}"`);
  return this;
}
```

2. Add instructions method:

```typescript
addProductInstructions(): PromptBuilder {
  const instructions = `Instructions:
- Include pricing information
- List key features and specifications
- Compare with similar products
- Include user ratings and reviews
- Cite sources with [1], [2], etc.`;

  this.sections.push(instructions);
  return this;
}
```

3. Add convenience method:

```typescript
static buildProductPrompt(
  productName: string,
  sources: Source[]
): string {
  return new PromptBuilder()
    .addProductQuery(productName)
    .addSources(sources)
    .addProductInstructions()
    .build();
}
```

## Benefits

1. **Maintainability** - Prompts are organized in one place
2. **Consistency** - Shared instructions ensure uniform responses
3. **Flexibility** - Mix and match components as needed
4. **Testability** - Easy to unit test prompt generation
5. **Extensibility** - Simple to add new prompt types
