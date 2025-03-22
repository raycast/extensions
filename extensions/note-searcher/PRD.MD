# Note Searcher - Product Requirements Document

## Overview
Note Searcher is a Raycast extension that allows users to quickly save and search notes using semantic vector search powered by Upstash Vector. The extension will have two main commands:
1. Add Note - To save text or URL content to the vector database
2. Search Note - To perform semantic search across saved notes

## Requirements

### Functional Requirements
1. Add Note Command:
   - Accept text input directly and save it to Upstash Vector
   - If the input contains a URL, extract and save only the URL
   - Provide feedback to the user after a note is successfully saved

2. Search Note Command:
   - Provide a UI to search through saved notes
   - Perform semantic search using vector similarity
   - Display search results in a list with relevant actions

### Technical Requirements
1. Use Upstash Vector for storage and retrieval
2. Store vector embeddings for efficient semantic search
3. No use of LLMs - only basic text parsing and vector operations
4. Ensure proper error handling for network failures or invalid inputs

## Technical Architecture

### Components
1. **Add Note Command** (`src/add-note.ts`)
   - Parses input to extract text or URLs
   - Generates vector embeddings for the content
   - Stores the content and embeddings in Upstash Vector

2. **Search Note Command** (`src/search-note.tsx`)
   - Provides a search interface
   - Converts search query to vector embeddings
   - Queries Upstash Vector for similar notes
   - Displays results in a formatted list

3. **Shared Utilities** (`src/utils/index.ts`)
   - Vector embedding generation
   - Upstash Vector database operations
   - URL extraction functionality

### Data Flow
1. User inputs text or URL to Add Note command
2. Extension extracts content, generates embeddings, and stores in Upstash
3. User performs search with Search Note command
4. Extension converts search query to vector and queries Upstash
5. Results are displayed in a list format

## Implementation Plan

### Phase 1: Setup
1. Initialize project structure
2. Add required dependencies (@upstash/vector)
3. Setup environment variables for Upstash credentials

### Phase 2: Core Functionality
1. Implement URL extraction functionality
2. Setup Upstash Vector connection
3. Create vector embedding generation utility
4. Implement Add Note command
5. Implement Search Note command

### Phase 3: Testing & Refinement
1. Test with various input types (text, URLs)
2. Optimize search performance
3. Improve error handling
4. Enhance UI/UX

### Phase 4: Documentation & Deployment
1. Update README with usage instructions
2. Prepare extension for publication
3. Publish to Raycast Store

## Dependencies
- @raycast/api - Core Raycast extension API
- @upstash/vector - Client for Upstash Vector database
- node-fetch - For making HTTP requests (if needed)

## Timeline
- Phase 1: 1 day
- Phase 2: 2-3 days
- Phase 3: 1-2 days
- Phase 4: 1 day

Total estimated time: 5-7 days
