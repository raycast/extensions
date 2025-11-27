# Detailed Plan for Raycast Extension with Google File Search RAG

## Extension Overview

**Name**: Google File Search RAG (or "Doc Assistant" / "Knowledge Base")
**Description**: Upload documents to Google File Search and ask questions based on your knowledge base using RAG.

---

## Technical Architecture

### Prerequisites
- Raycast Extension API knowledge
- Google AI API key
- Google Gemini SDK for Node.js (`@google/generative-ai`)
- TypeScript/React for Raycast extensions

### Data Storage Strategy
Since Raycast extensions have limited persistent storage, you'll need to store:
- **Local Cache** (using Raycast's LocalStorage API):
  - File Search Store ID
  - Uploaded documents metadata (name, ID, upload date, size)
  - API key (encrypted in preferences)

---

## Command 1: Upload Files

### User Flow
1. User triggers "Upload Document" command
2. File picker opens to select local file(s)
3. Extension uploads file to Google File Search Store
4. Shows progress indicator
5. Confirms success and displays document info
6. Updates local cache with document metadata

### Technical Implementation

```typescript
interface UploadCommand {
  // UI Components
  - File picker (using Node.js fs module)
  - Progress HUD
  - Success toast with document details

  // Backend Logic
  - Check if File Search Store exists (create if not)
  - Read file from local path
  - Call uploadToFileSearchStore API
  - Store document metadata locally
  - Handle errors (file too large, unsupported format, API errors)
}
```

### Key Features
- **Batch upload** support (multiple files at once)
- **File validation** (check format and size before upload)
- **Metadata tagging** (optional: add custom tags/categories)
- **Progress tracking** for large files
- **Error handling** with clear messages

### API Calls
```
POST /uploadToFileSearchStore
- Create File Search Store (if first upload)
- Upload file with chunking_config (optional)
- Store returned document ID and metadata
```

---

## Command 2: Ask Questions

### User Flow
1. User triggers "Ask Question" command
2. Search bar appears with placeholder "Ask anything about your documents..."
3. User types question and hits Enter
4. Loading indicator shows "Searching documents..."
5. Answer appears with:
   - Main response text
   - Citations (which documents were used)
   - Option to copy answer
   - Option to open source document

### Technical Implementation

```typescript
interface AskCommand {
  // UI Components
  - Search bar input
  - Detail view for answer display
  - Citation list with document references
  - Actions: Copy, Open Source, Ask Follow-up

  // Backend Logic
  - Call generateContent with FileSearch tool
  - Parse response and grounding_metadata
  - Format citations with document names
  - Handle "no relevant info found" cases
}
```

### Key Features
- **Streaming responses** (if supported, for better UX)
- **Citation display** showing which documents were referenced
- **Follow-up questions** (maintain conversation context)
- **Filter by document** (optional: search only specific docs using metadata_filter)
- **Copy answer** to clipboard
- **Answer history** (cache recent Q&A pairs)

### API Calls
```
POST /generateContent
- Include FileSearch tool with store ID
- Pass user query as prompt
- Retrieve grounding_metadata for citations
- Parse and display results
```

---

## Command 3: List Documents

### User Flow
1. User triggers "List Documents" command
2. Shows list of all uploaded documents with:
   - Document name
   - Upload date
   - File size
   - Status (indexed/processing)
3. Actions per document:
   - Delete document
   - View metadata
   - Ask question about this specific doc
   - Re-index (if needed)

### Technical Implementation

```typescript
interface ListCommand {
  // UI Components
  - List view with document items
  - Search/filter bar
  - Actions menu per document
  - Empty state (if no documents)

  // Backend Logic
  - Fetch documents from File Search Store
  - Display cached metadata
  - Sync with remote store
  - Handle document deletion
}
```

### Key Features
- **Search/filter** documents by name
- **Sort options** (by date, name, size)
- **Document actions**:
  - Delete (with confirmation)
  - View details (metadata, chunk count)
  - Quick ask (pre-fill "Ask" command with doc filter)
- **Storage usage** indicator
- **Refresh** to sync with remote store

### API Calls
```
GET /file-search-stores/{storeId}/documents
- List all documents in store
- Get document metadata
DELETE /documents/{documentId}
- Remove document from store
```

---

## Additional Commands (Optional Enhancements)

### 4. Settings/Preferences
- **API Key management** (secure input)
- **Default File Search Store** selection
- **Model selection** (gemini-2.5-pro vs gemini-2.5-flash)
- **Chunking configuration** (chunk size, overlap)
- **Citation preferences** (show/hide, format)

### 5. Quick Actions
- **Ask from Clipboard** - Ask question using clipboard content
- **Upload from Finder** - Right-click integration
- **Search History** - View past questions and answers

---

## Data Models

### Local Storage Schema

```typescript
interface LocalCache {
  fileSearchStoreId: string;
  documents: Document[];
  settings: Settings;
  queryHistory: QueryHistory[];
}

interface Document {
  id: string;
  name: string;
  uploadDate: string;
  size: number;
  status: 'indexed' | 'processing' | 'error';
  metadata?: Record<string, string>;
}

interface Settings {
  apiKey: string;
  defaultModel: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

interface QueryHistory {
  question: string;
  answer: string;
  citations: Citation[];
  timestamp: string;
}

interface Citation {
  documentId: string;
  documentName: string;
  chunkText?: string;
}
```

---

## Implementation Phases

### Phase 1: MVP (Core Functionality)
1. ✅ Setup Raycast extension project
2. ✅ Implement API key configuration
3. ✅ Create File Search Store on first run
4. ✅ Upload command (single file)
5. ✅ Ask command (basic Q&A)
6. ✅ List command (basic list view)

### Phase 2: Enhanced UX
1. ✅ Batch upload support
2. ✅ Citation display in answers
3. ✅ Document deletion
4. ✅ Error handling and validation
5. ✅ Loading states and progress indicators

### Phase 3: Advanced Features
1. ✅ Metadata tagging and filtering
2. ✅ Query history
3. ✅ Follow-up questions with context
4. ✅ Document-specific search
5. ✅ Storage usage tracking

### Phase 4: Polish
1. ✅ Keyboard shortcuts optimization
2. ✅ Empty states and onboarding
3. ✅ Performance optimization
4. ✅ Documentation and README
5. ✅ Submit to Raycast Store

---

## Technical Considerations

### API Rate Limits
- Implement rate limiting handling
- Show quota usage warnings
- Cache responses when appropriate

### File Size Limits
- Validate file size before upload (check Google's limits)
- Show clear error messages for oversized files
- Consider chunking large files

### Error Handling
- Network errors (retry logic)
- API errors (clear user messages)
- Invalid API key (prompt for re-entry)
- File format errors (list supported formats)

### Performance
- Lazy load document list for large collections
- Cache File Search Store ID
- Debounce search inputs
- Optimize API calls (batch when possible)

### Security
- Store API key securely (Raycast preferences)
- Never log sensitive data
- Validate file contents before upload


## User Experience Flow

### First Time Setup
1. Install extension
2. Open any command
3. Prompted for Google AI API key
4. Extension creates File Search Store automatically
5. Ready to upload first document

### Typical Usage
1. **Upload documents** → User uploads PDFs, docs, etc.
2. **Ask questions** → User queries their knowledge base
3. **Get answers** → Receives grounded responses with citations
4. **Manage docs** → View, delete, or organize documents

---

## Success Metrics

- **Upload success rate** (% of successful uploads)
- **Query response time** (average time to answer)
- **Citation accuracy** (relevant sources cited)
- **User retention** (daily/weekly active usage)
- **Document count** (average docs per user)

---
