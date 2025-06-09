# TPB Torrents - Raycast Extension

A modern, performant Raycast extension for searching torrents using the apibay.org API with enterprise-grade architecture.

## 🚀 Features

- **Real-time search** with intelligent debouncing (500ms)
- **Smart caching** - Results cached for 5 minutes to reduce API calls
- **Request cancellation** - Prevents race conditions and unnecessary requests
- **Detailed torrent view** - Complete torrent information with description
- **One-click actions** - Copy magnet links, info hashes, or open in browser
- **Performance optimized** - Memoized components and efficient re-renders
- **Type-safe** - Full TypeScript coverage with strict typing

## 📁 Architecture

```
src/
├── components/           # React components
│   ├── TorrentDetailView.tsx
│   └── index.ts
├── hooks/               # Custom React hooks
│   ├── useTorrentSearch.ts
│   ├── useTorrentDetail.ts
│   └── index.ts
├── services/            # API service layer
│   ├── torrent.service.ts
│   └── index.ts
├── types/               # TypeScript type definitions
│   ├── torrent.types.ts
│   └── index.ts
├── utils/               # Utility functions
│   ├── torrent.utils.ts
│   └── index.ts
├── constants/           # Application constants
│   ├── api.constants.ts
│   └── index.ts
└── search-torrent.tsx   # Main command entry point
```

## 🛠 Technical Highlights

### Performance Optimizations
- **Memoization**: Components and computations memoized with `useMemo` and `useCallback`
- **Request Cancellation**: AbortController prevents duplicate/stale requests
- **Intelligent Caching**: 5-minute cache reduces API load and improves UX
- **Debounced Search**: 500ms delay prevents excessive API calls while typing

### Type Safety
- **Strict TypeScript**: Full type coverage with discriminated unions
- **API Error Handling**: Custom APIError class with status codes
- **Type Guards**: Runtime type validation for API responses

### Clean Architecture
- **Separation of Concerns**: Clear boundaries between UI, business logic, and data
- **Custom Hooks**: Reusable stateful logic extraction
- **Service Layer**: Centralized API communication with error handling
- **Barrel Exports**: Clean import paths and module organization

## 🎯 Usage

1. Open Raycast
2. Search for "Search torrent"
3. Type your search query
4. Browse results with file sizes, seeders/leechers info
5. Press Enter to view detailed information
6. Use actions to copy magnet links or open in browser

## 🔧 Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Lint and fix
npm run fix-lint
```

## 📊 API Integration

Uses the apibay.org API:
- **Search**: `GET /q.php?q={query}&cat=0`
- **Details**: `GET /t.php?id={torrentId}`

Implements robust error handling, request cancellation, and caching strategies.

## 🎨 UI/UX

- **Contextual Icons**: Different icons for video, audio, applications, games
- **Rich Information**: File sizes, dates, user info displayed clearly
- **Loading States**: Proper loading indicators and empty states
- **Toast Notifications**: User feedback for copy actions and errors
- **Responsive Design**: Adapts to different content lengths and screen sizes

## 🔒 Error Handling

- **Network Failures**: Graceful degradation with user-friendly messages
- **API Errors**: HTTP status code handling with detailed error reporting
- **Request Cancellation**: Clean handling of aborted requests
- **Invalid Data**: Type validation and fallback rendering

---

Built with modern React patterns, TypeScript, and performance-first principles.