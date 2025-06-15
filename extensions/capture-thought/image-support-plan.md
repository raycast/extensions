# Phase 2: Image Support Implementation Plan

## Overview
Add full support for capturing, analyzing, and storing images from clipboard as part of the thought capture workflow.

## Core Features

### 1. Image Detection & Handling
- **Clipboard image detection** using Raycast API
- **Image format support**: PNG, JPG, GIF, WebP
- **Size limits**: Max 10MB per image
- **Preview generation**: Thumbnail for choice screen

### 2. AI Image Analysis
- **Vision AI integration**: GPT-4 Vision API for image understanding
- **Context extraction**: 
  - What's in the image (objects, text, scenes)
  - Any visible text (OCR capabilities)
  - Relevant details for thought classification
- **Combined analysis**: Image content + any additional user text

### 3. Notion Storage Strategy
- **Image as attachment**: Store original image file in Notion page
- **Rich content**: Image displayed inline in page content
- **Raw input preservation**: Always store original context at bottom

### 4. Enhanced Data Flow
```
Input Sources:
├── Text (selection/clipboard) → AI text analysis
├── Image (clipboard) → AI vision analysis  
├── Image + Text → Combined AI analysis
└── Manual input → Standard text analysis

All → Store raw inputs → Save to Notion with attachments
```

## Technical Implementation

### Backend Changes

#### 1. Update Server Types & Interfaces
```typescript
// Add to types.ts
interface ImageInput {
  type: 'image';
  content: string; // base64 encoded
  mimeType: string;
  filename?: string;
}

interface ThoughtInput {
  text?: string;
  image?: ImageInput;
  context?: "clipboard" | "selection" | "dictation" | "image" | "mixed";
}

interface AIClassification {
  title: string;
  description: string;
  type: ThoughtType;
  priority: Priority;
  category: Category;
  dueDate?: string;
  imageAnalysis?: string; // Description of image content
}

interface CreateThoughtRequest {
  title: string;
  description: string;
  type: string;
  priority: string;
  category: string;
  dueDate?: string;
  attachments?: ImageInput[];
  rawInput?: {
    text?: string;
    image?: ImageInput;
    source: string;
    timestamp: string;
  };
}
```

#### 2. AI Vision Analysis Endpoint
```typescript
// Add to server.ts
async function analyzeImage(imageData: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { 
            type: "text", 
            text: "Analyze this image and describe what you see. Focus on: 1) Main subject/content 2) Any visible text 3) Context that would be useful for categorizing this as a task, idea, or note. Be concise but thorough." 
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageData}`
            }
          }
        ]
      }
    ],
    max_tokens: 300
  });
  
  return response.choices[0]?.message?.content || "Unable to analyze image";
}

async function classifyThoughtWithImage(input: ThoughtInput): Promise<AIClassification> {
  let analysisPrompt = "";
  
  if (input.image) {
    const imageAnalysis = await analyzeImage(input.image.content);
    analysisPrompt += `Image analysis: ${imageAnalysis}\n`;
  }
  
  if (input.text) {
    analysisPrompt += `User text: ${input.text}\n`;
  }
  
  // Continue with existing classification logic using combined analysis
  // ...
}
```

#### 3. Notion Storage with Attachments
```typescript
async function createNotionThoughtWithAttachments(thought: CreateThoughtRequest): Promise<string> {
  // 1. Upload images to Notion first
  const uploadedFiles = [];
  if (thought.attachments) {
    for (const attachment of thought.attachments) {
      const file = await uploadImageToNotion(attachment);
      uploadedFiles.push(file);
    }
  }
  
  // 2. Create page with content structure
  const children = [
    // Main description as paragraph
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: thought.description } }]
      }
    },
    
    // Images inline
    ...uploadedFiles.map(file => ({
      object: 'block',
      type: 'image',
      image: {
        type: 'file',
        file: { url: file.url }
      }
    })),
    
    // Divider
    { object: 'block', type: 'divider', divider: {} },
    
    // Raw input section
    {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: 'Raw Input Context' } }]
      }
    },
    
    // Raw input details
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: `Source: ${thought.rawInput?.source}\n` } },
          { type: 'text', text: { content: `Captured: ${thought.rawInput?.timestamp}\n` } },
          ...(thought.rawInput?.text ? [{ type: 'text', text: { content: `Text: ${thought.rawInput.text}` } }] : [])
        ]
      }
    }
  ];
  
  const response = await notion.pages.create({
    parent: { database_id: process.env.NOTION_DATABASE_ID! },
    properties: { /* existing properties */ },
    children
  });
  
  return response.id;
}
```

### Frontend Changes

#### 1. Clipboard Image Detection
```typescript
// Add to capture-thought.tsx
async function detectClipboardImage(): Promise<DetectedInput | null> {
  try {
    const clipboardContent = await Clipboard.read();
    
    if (clipboardContent.file && clipboardContent.file.startsWith('data:image/')) {
      const base64Data = clipboardContent.file.split(',')[1];
      const mimeType = clipboardContent.file.split(';')[0].split(':')[1];
      
      return {
        type: "clipboard-image",
        content: base64Data,
        preview: "Image from clipboard",
        metadata: { mimeType }
      };
    }
    
    return null;
  } catch {
    return null;
  }
}
```

#### 2. Image Preview in Choice Screen
```typescript
// Enhanced List.Item for images
<List.Item
  icon={Icon.Image}
  title="Clipboard Image"
  subtitle="Image from clipboard - will be analyzed with AI"
  accessories={[
    { text: "📸", tooltip: "Image will be stored as attachment" }
  ]}
  actions={
    <ActionPanel>
      <Action
        title="Use This Image"
        onAction={() => handleInputChoice(input)}
      />
      <Action
        title="Preview Image"
        onAction={() => showImagePreview(input.content)}
      />
    </ActionPanel>
  }
/>
```

#### 3. Combined Input Handling
```typescript
// Support for image + text combinations
function handleInputChoice(input: DetectedInput | "fresh") {
  if (input.type === "clipboard-image") {
    setFormValues(prev => ({
      ...prev,
      inputText: "", // Start with empty text for additional context
      imageData: input.content,
      imageMimeType: input.metadata?.mimeType
    }));
    setInputSource("clipboard");
    
    showToast({
      title: "Image captured",
      message: "Add any additional context, then analyze",
    });
  }
  // ... other input types
}
```

## Storage Pattern: Raw Input Preservation

### Notion Page Structure
```
[Title from AI]

[Description from AI analysis]

[Image attachment displayed inline]

---

### Raw Input Context
**Source**: clipboard-image  
**Captured**: 2024-01-20 15:30:22  
**User Text**: "Additional context provided by user"  
**Image**: [Original image stored as attachment]  

This raw context can be used for re-prompting with other AI models or future analysis.
```

## Testing Strategy

### 1. Image Format Testing
- PNG screenshots
- JPG photos  
- GIF animations
- WebP images
- Large images (size limits)

### 2. Content Testing
- Screenshots of apps/websites
- Photos with text (OCR testing)
- Diagrams and flowcharts
- Mixed content (image + user text)

### 3. Integration Testing
- Clipboard → AI analysis → Notion storage
- Image previews in Raycast
- Attachment storage and retrieval
- Raw input preservation

## Security Considerations

### 1. Image Processing
- Validate image formats and sizes
- Sanitize base64 data
- Limit processing time per image

### 2. Storage
- Secure upload to Notion
- Image access permissions
- Temporary file cleanup

### 3. Privacy
- No persistent local storage of images
- Clear memory after processing
- User consent for AI image analysis

## Future Enhancements

### 1. Advanced Image Processing
- Multiple images per thought
- Image cropping/editing
- OCR text extraction and separate handling

### 2. Smart Categorization
- Auto-detect screenshots vs photos
- Context-aware priority assignment
- Category suggestions based on image content

### 3. Integration Extensions
- Direct image capture (screenshot tool)
- Drag & drop image support
- Image annotation capabilities

## Implementation Priority

1. **Phase 2A**: Basic image detection and storage
2. **Phase 2B**: AI vision analysis integration  
3. **Phase 2C**: Enhanced Notion storage with attachments
4. **Phase 2D**: Raw input preservation
5. **Phase 2E**: Advanced features and optimizations

This plan provides a comprehensive roadmap for adding robust image support while maintaining the clean, user-controlled experience established in Phase 1. 