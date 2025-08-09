# 技術實現指南

## 瀏覽器整合策略

### 主要整合方法（按優先順序）

#### 1. AppleScript 整合（首選）
```typescript
// 測試 Comet 是否支援 AppleScript
import { runAppleScript } from "@raycast/utils";

export async function testCometAppleScript() {
  try {
    const result = await runAppleScript(`
      tell application "Comet"
        get name
      end tell
    `);
    return result;
  } catch (error) {
    console.error("Comet 不支援 AppleScript:", error);
    return null;
  }
}
```

**研究步驟**:
1. 開啟 Script Editor
2. 檢查 File > Open Dictionary 中是否有 Comet
3. 測試基本命令如 `get windows`、`get tabs`

#### 2. 資料庫直接存取（備選方案）
由於 Comet 基於 Chromium，可能使用類似的資料庫結構：

```typescript
// 可能的歷史資料庫位置
const possiblePaths = [
  "~/Library/Application Support/Comet/Default/History",
  "~/Library/Application Support/Perplexity Comet/Default/History",
  "~/Library/Application Support/Comet/User Data/Default/History"
];
```

**使用 @raycast/utils 的 useSQL**:
```typescript
import { useSQL } from "@raycast/utils";

export function useCometHistory(searchText: string) {
  const query = `
    SELECT 
      id, 
      url, 
      title,
      last_visit_time
    FROM urls
    WHERE title LIKE '%${searchText}%' 
       OR url LIKE '%${searchText}%'
    ORDER BY last_visit_time DESC
    LIMIT 100
  `;
  
  return useSQL(databasePath, query);
}
```

#### 3. URL Schemes（基本功能）
```typescript
// 開啟 URL 在 Comet
export async function openInComet(url: string) {
  await open(`comet://${url}`);
}

// 可能的 URL schemes
const schemes = {
  open: "comet://open?url=",
  search: "comet://search?q=",
  newTab: "comet://newtab"
};
```

#### 4. 系統自動化（最後手段）
```typescript
// 使用 System Events 進行 UI 自動化
export async function getCometTabsViaUI() {
  return await runAppleScript(`
    tell application "System Events"
      tell process "Comet"
        -- 獲取視窗標題等資訊
        get title of windows
      end tell
    end tell
  `);
}
```

## 資料結構設計

### TypeScript 類型定義

```typescript
// src/lib/types.ts

export interface CometTab {
  id: string;
  windowId: string;
  url: string;
  title: string;
  favicon?: string;
  isActive: boolean;
  isPinned?: boolean;
  lastAccessed?: Date;
}

export interface CometHistoryEntry {
  id: string;
  url: string;
  title: string;
  visitCount: number;
  lastVisitTime: Date;
  favicon?: string;
}

export interface SearchResult {
  type: 'tab' | 'history';
  score: number;  // 搜尋相關性分數
  data: CometTab | CometHistoryEntry;
}

export interface CometWindow {
  id: string;
  title: string;
  tabs: CometTab[];
  isMinimized: boolean;
  isFocused: boolean;
}
```

## 核心功能實現

### 1. 分頁管理模組

```typescript
// src/lib/comet.ts

import { runAppleScript } from "@raycast/utils";
import { CometTab, CometWindow } from "./types";

export class CometBrowser {
  // 獲取所有分頁
  async getTabs(): Promise<CometTab[]> {
    // 嘗試多種方法獲取分頁
    const tabs = await this.getTabsViaAppleScript() 
                 || await this.getTabsViaDatabase()
                 || await this.getTabsViaSystemEvents();
    
    return tabs || [];
  }

  // 切換到特定分頁
  async switchToTab(tab: CometTab): Promise<void> {
    // 實現分頁切換邏輯
  }

  // 在新分頁開啟 URL
  async openInNewTab(url: string): Promise<void> {
    // 實現開啟新分頁邏輯
  }
}
```

### 2. 搜尋引擎實現

```typescript
// src/lib/search.ts

import Fuse from 'fuse.js';
import { SearchResult, CometTab, CometHistoryEntry } from './types';

export class SearchEngine {
  private fuseOptions = {
    keys: ['title', 'url', 'domain'],
    threshold: 0.3,
    includeScore: true,
    sortFn: (a: any, b: any) => {
      // 自定義排序：分頁優先於歷史
      if (a.item.type === 'tab' && b.item.type === 'history') return -1;
      if (a.item.type === 'history' && b.item.type === 'tab') return 1;
      return a.score - b.score;
    }
  };

  search(query: string, tabs: CometTab[], history: CometHistoryEntry[]): SearchResult[] {
    const searchItems = [
      ...tabs.map(tab => ({ type: 'tab' as const, data: tab })),
      ...history.map(entry => ({ type: 'history' as const, data: entry }))
    ];

    const fuse = new Fuse(searchItems, this.fuseOptions);
    return fuse.search(query);
  }
}
```

### 3. React Hooks 實現

```typescript
// src/hooks/useCometTabs.ts

import { useCachedPromise } from "@raycast/utils";
import { CometBrowser } from "../lib/comet";

export function useCometTabs() {
  const browser = new CometBrowser();
  
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async () => await browser.getTabs(),
    [],
    {
      keepPreviousData: true,
      initialData: [],
      failureRetryCount: 2,
    }
  );

  return {
    tabs: data || [],
    isLoading,
    error,
    refresh: revalidate
  };
}
```

## 效能優化策略

### 1. 快取實現
```typescript
// 使用 @raycast/utils 的快取功能
const { data, revalidate } = useCachedPromise(
  fetchData,
  [],
  {
    keepPreviousData: true,
    // 30 秒後自動重新驗證
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  }
);
```

### 2. 延遲載入
```typescript
// 只在需要時載入歷史記錄
const [shouldLoadHistory, setShouldLoadHistory] = useState(false);

useEffect(() => {
  // 延遲 500ms 後載入歷史，避免初始載入過慢
  const timer = setTimeout(() => setShouldLoadHistory(true), 500);
  return () => clearTimeout(timer);
}, []);
```

### 3. 搜尋去抖動
```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback(
  (searchText: string) => {
    performSearch(searchText);
  },
  300 // 300ms 去抖動
);
```

## 錯誤處理

### 1. 優雅降級
```typescript
export async function getCometData() {
  try {
    // 嘗試最佳方法
    return await getViaAppleScript();
  } catch (error1) {
    console.warn("AppleScript 失敗，嘗試資料庫存取");
    try {
      // 降級到資料庫
      return await getViaDatabase();
    } catch (error2) {
      console.warn("資料庫存取失敗，使用基本功能");
      // 最終降級
      return getBasicFunctionality();
    }
  }
}
```

### 2. 使用者友好的錯誤訊息
```typescript
import { showToast, Toast } from "@raycast/api";

export async function handleError(error: unknown) {
  console.error("詳細錯誤:", error);
  
  if (error instanceof CometNotFoundError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "找不到 Comet 瀏覽器",
      message: "請確認 Comet 已安裝並正在執行",
      primaryAction: {
        title: "下載 Comet",
        onAction: () => open("https://comet.perplexity.ai")
      }
    });
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "發生錯誤",
      message: "請稍後再試"
    });
  }
}
```

## 測試策略

### 1. 單元測試範例
```typescript
// tests/search.test.ts
describe('SearchEngine', () => {
  it('應該優先返回分頁結果', () => {
    const tabs = [{ title: 'GitHub', url: 'github.com', type: 'tab' }];
    const history = [{ title: 'GitHub Old', url: 'github.com/old', type: 'history' }];
    
    const results = searchEngine.search('github', tabs, history);
    expect(results[0].type).toBe('tab');
  });
});
```

### 2. 整合測試檢查清單
- [ ] 能否成功連接 Comet
- [ ] 能否獲取所有開啟的分頁
- [ ] 能否切換到特定分頁
- [ ] 能否搜尋歷史記錄
- [ ] 錯誤處理是否正常運作

## 相容性考量

### macOS 版本支援
- 最低要求：macOS 12.0 (Monterey)
- 建議版本：macOS 14.0 (Sonoma) 或更新

### Comet 版本支援
- 需要研究不同版本的 API 差異
- 實現版本檢測和相容性警告

### Raycast 版本要求
- 最低：Raycast 1.26.0
- API 版本：@raycast/api ^1.102.3