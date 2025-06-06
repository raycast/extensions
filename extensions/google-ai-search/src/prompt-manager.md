# PromptManager Documentation

The PromptManager implements a context-aware prompt generation system that intelligently analyzes queries and generates appropriate prompts based on the query type and available context.

## Architecture Overview

```
Query → Analyzers → Best Analysis → Generator → Prompt
```

1. **Query Analysis**: Multiple analyzers examine the query in parallel
2. **Confidence Selection**: The analysis with highest confidence wins
3. **Prompt Generation**: A specialized generator creates the prompt
4. **Context Integration**: User location, sources, and preferences are incorporated

## Core Components

### QueryAnalyzer

Analyzes queries to determine their type and extract relevant data.

```typescript
class MyAnalyzer extends QueryAnalyzer {
  async analyze(query: string, context: QueryContext): Promise<QueryAnalysis> {
    // Analyze the query
    return {
      type: QueryType.MY_TYPE,
      confidence: 0.8, // 0-1 scale
      extractedData: {
        /* custom data */
      },
      requiresLocation: false,
      hasExplicitLocation: false,
    };
  }
}
```

### PromptGenerator

Generates prompts based on the analysis and context.

```typescript
class MyGenerator extends PromptGenerator {
  generate(analysis: QueryAnalysis, context: QueryContext): string {
    // Generate appropriate prompt
    return `Custom prompt for ${analysis.extractedData.query}`;
  }
}
```

## Built-in Analyzers

### WeatherAnalyzer

- Detects weather-related queries
- Extracts location from weather queries
- Confidence: 0.9 for weather keywords, 0.0 otherwise

### AddressAnalyzer

- Detects street addresses
- Looks for number + street type patterns
- Confidence: 0.8-0.95 for addresses, lower otherwise

### LocalBusinessAnalyzer

- Detects business/location searches
- Identifies "near me" queries
- Confidence: 0.85 for business queries

### GeneralAnalyzer

- Fallback for all other queries
- Always returns 0.5 confidence
- Ensures every query gets handled

## Usage

### Basic Usage

```typescript
const promptManager = new PromptManager();

const context: QueryContext = {
  userLocation: { city: "Los Angeles", region: "CA" },
  sources: searchResults,
  preferences: userPreferences,
};

const prompt = await promptManager.getPrompt("weather tomorrow", context);
```

### Analyzing Without Generating

```typescript
const analysis = await promptManager.analyzeQuery("123 Main St", context);
console.log(`Query type: ${analysis.type}, Confidence: ${analysis.confidence}`);
```

### Extending the System

```typescript
// Add custom analyzer
class StockAnalyzer extends QueryAnalyzer {
  async analyze(query: string, context: QueryContext): Promise<QueryAnalysis> {
    const hasStockSymbol = /\$[A-Z]+/.test(query);
    return {
      type: QueryType.STOCK, // Add to enum
      confidence: hasStockSymbol ? 0.9 : 0.0,
      extractedData: { symbol: query.match(/\$([A-Z]+)/)?.[1] },
      requiresLocation: false,
      hasExplicitLocation: false,
    };
  }
}

// Register it
promptManager.registerAnalyzer(new StockAnalyzer(), "high");
promptManager.registerGenerator(QueryType.STOCK, new StockGenerator());
```

## Benefits

1. **Intelligent Query Understanding**: Automatically detects query intent
2. **Context-Aware**: Prompts adapt based on available data
3. **Extensible**: Easy to add new query types
4. **Maintainable**: Centralized prompt logic
5. **Testable**: Each component can be tested independently
6. **Flexible**: Can override or extend built-in behavior

## Query Context

The context object provides rich information:

```typescript
interface QueryContext {
  userLocation?: UserLocation; // User's current location
  searchHistory?: string[]; // Previous searches
  sources?: Source[]; // Search results
  preferences?: Preferences; // User preferences
  addressComponents?: AddressComponents; // Parsed address data
  conversationContext?: ConversationContext; // Follow-up conversation context
}
```

## Follow-up Questions

The PromptManager supports contextual follow-up questions for general intents.

### How It Works

1. **Context Preservation**: When a user asks a follow-up question, the previous Q&A is passed in `conversationContext`
2. **Prompt Enhancement**: The GeneralPromptGenerator detects conversation context and modifies the prompt
3. **Contextual Response**: Gemini receives the context and builds upon the previous answer

### Implementation Details

```typescript
// ConversationContext structure
interface ConversationContext {
  originalQuery: string; // Previous question
  previousResponse: string; // Previous AI response
  sources: Source[]; // Sources from previous response
  searchIntent: SearchIntent; // Previous intent analysis
  timestamp: number; // When conversation occurred
}
```

### Prompt Modification

When conversation context is present, the prompt includes:

- Previous question for reference
- **Full previous response** - Essential since Gemini is stateless
- Instructions to build upon previous answer without repetition

### Technical Rationale

**Why the full response is necessary:**

- Gemini API is stateless - has no memory of previous interactions
- Without the previous response, Gemini cannot know what it "said before"
- Just sending the previous question would be meaningless without the answer
- Each API call is completely independent

**Token usage optimization:**

- Responses under 2000 characters (~500-600 tokens) are included in full
- Longer responses use smart truncation:
  - Keeps 60% from the beginning (introduction and key points)
  - Keeps 30% from the end (conclusions and summaries)
  - Finds sentence boundaries for clean breaks
  - Indicates truncation to Gemini with clear marker
- This preserves context while managing token costs effectively

**Architecture constraints:**

- Raycast creates new component instances on navigation
- No shared state between views
- Context must be explicitly passed through navigation

### Current Limitations

- Only available for `QueryType.GENERAL` intents
- Single-level follow-up (no conversation chains)
- Context is passed explicitly, not using Gemini's session/token tracking
- No multi-turn conversation memory beyond immediate follow-up

## Best Practices

1. **Confidence Scores**: Use 0.7+ for high confidence, 0.4-0.7 for moderate
2. **Analyzer Order**: High-priority analyzers run first
3. **Data Extraction**: Extract as much useful data as possible in analyzers
4. **Generator Focus**: Keep generators focused on prompt generation only
5. **Context Usage**: Leverage all available context for better prompts

## Migration from PromptBuilder

The PromptManager replaces the PromptBuilder pattern with advantages:

- **Before**: Manual prompt type selection
- **After**: Automatic query analysis and routing

- **Before**: Static prompt templates
- **After**: Dynamic, context-aware generation

- **Before**: Scattered prompt logic
- **After**: Centralized, extensible system
