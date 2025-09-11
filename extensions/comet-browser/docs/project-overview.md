# Comet Browser Raycast 擴充套件 - 專案概述

## 專案目標

建立一個 Raycast 擴充套件，讓使用者能夠快速搜尋和管理 Perplexity Comet 瀏覽器中的分頁和瀏覽歷史。這個擴充套件的設計理念是提供快速、直覺的搜尋體驗，讓使用者能夠在幾秒內找到並切換到他們需要的網頁。

## 核心功能

### 1. 搜尋分頁 (Search Tabs)
- **命令名稱**: `search-tabs`
- **功能描述**: 搜尋目前在 Comet 瀏覽器中所有開啟的分頁
- **搜尋能力**:
  - 支援分頁標題搜尋（例如：搜尋 "GitHub Pull Requests"）
  - 支援網域搜尋（例如：搜尋所有來自 "youtube.com" 的分頁）
  - 支援模糊搜尋（使用 Fuse.js 實現）
- **顯示資訊**:
  - 網頁標題
  - 完整 URL
  - 網站圖標（favicon）
  - 分頁所在的視窗資訊

### 2. 搜尋歷史 (Search History)
- **命令名稱**: `search-history`
- **功能描述**: 搜尋 Comet 瀏覽器的瀏覽歷史記錄
- **搜尋能力**:
  - 支援歷史頁面標題搜尋
  - 支援網域和 URL 搜尋
  - 支援日期範圍篩選（可選功能）
- **顯示資訊**:
  - 網頁標題
  - URL
  - 最後訪問時間
  - 訪問次數（如果可用）

### 3. 統一搜尋 (Search Comet)
- **命令名稱**: `search-comet`
- **功能描述**: 結合分頁和歷史記錄的統一搜尋介面
- **優先順序邏輯**:
  1. 目前開啟的分頁（最高優先級）
  2. 最近的歷史記錄
  3. 較舊的歷史記錄
- **智慧功能**:
  - 自動去重（如果同一個 URL 既在分頁中開啟又在歷史中）
  - 根據使用頻率調整排序

## 使用者體驗設計

### 搜尋流程
1. 使用者啟動 Raycast（通常使用快捷鍵如 ⌘+Space）
2. 輸入命令名稱或從最近使用中選擇
3. 在搜尋框輸入關鍵字（如 "youtube" 或 "github"）
4. 即時顯示搜尋結果
5. 使用鍵盤上下選擇結果
6. 按 Enter 執行主要動作

### 可用操作
- **主要動作（Enter）**: 
  - 對於開啟的分頁：切換到該分頁
  - 對於歷史記錄：在新分頁開啟
- **次要動作（⌘+Enter）**: 在新視窗開啟
- **複製動作（⌘+C）**: 複製 URL
- **複製標題（⌘+⌥+C）**: 複製網頁標題
- **複製 Markdown（⌘+⇧+C）**: 複製為 Markdown 格式連結

## 技術架構

### 核心技術棧
- **語言**: TypeScript
- **框架**: React（Raycast 內建）
- **搜尋引擎**: Fuse.js（模糊搜尋）
- **資料快取**: @raycast/utils 的 useCachedPromise
- **瀏覽器整合**: AppleScript / URL Schemes / 系統自動化

### 專案結構
```
comet-browser/
├── src/
│   ├── commands/           # 命令實現
│   │   ├── search-tabs.tsx
│   │   ├── search-history.tsx
│   │   └── search-comet.tsx
│   ├── lib/               # 核心功能庫
│   │   ├── comet.ts       # Comet 瀏覽器整合
│   │   ├── types.ts       # TypeScript 類型定義
│   │   └── utils.ts       # 工具函數
│   ├── components/        # UI 元件
│   │   ├── TabListItem.tsx
│   │   ├── HistoryListItem.tsx
│   │   └── SearchResultItem.tsx
│   └── hooks/             # 自定義 React Hooks
│       ├── useCometTabs.ts
│       └── useCometHistory.ts
├── assets/                # 圖標和靜態資源
├── docs/                  # 專案文件
└── tests/                 # 測試文件（可選）
```

## 開發階段規劃

### 第一階段：基礎架構（1-2 天）
1. 研究 Comet 瀏覽器的整合方式
2. 建立基本的專案結構
3. 實現與 Comet 的基本通訊

### 第二階段：核心功能（3-4 天）
1. 實現搜尋分頁功能
2. 實現搜尋歷史功能
3. 建立統一搜尋介面

### 第三階段：優化和完善（2-3 天）
1. 加入模糊搜尋
2. 優化效能（快取、延遲載入）
3. 完善使用者介面
4. 加入錯誤處理

### 第四階段：測試和發布（1-2 天）
1. 完整測試所有功能
2. 撰寫使用文件
3. 準備發布到 Raycast Store

## 成功指標

1. **效能**: 搜尋結果在 100ms 內顯示
2. **準確性**: 搜尋結果相關性高
3. **易用性**: 使用者能在 3 秒內找到目標網頁
4. **穩定性**: 錯誤率低於 0.1%

## 潛在挑戰

1. **Comet API 限制**: Comet 可能沒有公開的 API 或 AppleScript 支援
2. **資料存取**: 可能需要直接存取 Comet 的資料庫檔案
3. **效能優化**: 大量分頁和歷史記錄時的搜尋效能
4. **跨平台相容**: 目前只支援 macOS