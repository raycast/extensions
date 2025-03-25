export type Language = "en" | "zh";

export const translations = {
  en: {
    // Global
    loading: "Loading",
    pleaseWait: "Please wait...",
    refreshingBookmarks: "Refreshing bookmarks...",
    bookmarksRefreshed: "Bookmarks refreshed",
    searchBookmarks: "Search bookmarks...",

    // Common Actions & Messages
    common: {
      delete: "Delete",
      deleting: "Deleting...",
      deleteSuccess: "Deleted successfully",
      deleteFailed: "Delete failed",
      deleteCancel: "Delete cancelled",
      viewInBrowser: "View in Browser",
      copyId: "Copy ID",
      open: "Open",
      search: "Search",
      empty: {
        title: "No items found",
        description: "No items in this list",
      },
    },

    // Bookmark Related
    bookmark: {
      // Creation
      create: "Create Bookmark",
      creating: "Creating bookmark...",
      createSuccess: "Bookmark created successfully",
      createFailed: "Creation failed",

      // Types and Fields
      type: "Type",
      typeText: "Plain Text",
      typeLink: "URL Link",
      content: "Content",
      contentRequired: "Content is required",
      contentTooLong: "Content cannot exceed 2500 characters",
      contentPlaceholder: "Enter text content (max 2500 characters)",
      url: "URL",
      urlInvalid: "Please enter a valid URL",
      urlPlaceholder: "Enter URL",
      note: "Note",
      notePlaceholder: "Enter note (optional)",

      // Titles
      title: "Bookmark Detail",
      untitled: "Untitled",
      untitledImage: "Untitled Image",
      originalTitle: "Original Title",
      customTitle: "Custom Title",
      titlePlaceholder: "Enter title",
      list: "List",
      defaultListPlaceholder: "Default",
      // Sections
      sections: {
        summary: "📝 Summary",
        note: "📒 Note",
      },

      // Actions
      actions: {
        openInBrowser: "Open in Browser",
        previewInDashboard: "Preview in Dashboard",
        openLink: "Open Link",
        copyLink: "Copy Link",
        copyContent: "Copy Content",
        aiSummary: "AI Summary",
        favorite: "Favorite",
        unfavorite: "Unfavorite",
        archive: "Archive",
        unarchive: "Unarchive",
        delete: "Delete",
        edit: "Edit",
      },

      // Metadata
      metadata: {
        status: "Status",
        tags: "Tags",
        createdAt: "Created At",
        description: "Description",
        content: "Content",
        summary: "Summary",
        filename: "Filename",
        note: "Note",
      },

      // Status
      status: {
        favorited: "Favorited",
        unfavorited: "Unfavorited",
        archived: "Archived",
        unarchived: "Unarchived",
        summarized: "AI Summary",
        unsummarized: "Unsummarized",
      },

      // Toast Messages
      toast: {
        summarize: {
          title: "Summarize Bookmark",
          loading: "Summarizing bookmark...",
          success: "Summarized successfully",
        },
        update: {
          title: "Update Bookmark",
          loading: "Updating...",
          success: "Updated successfully",
        },
        delete: {
          title: "Delete Bookmark",
          loading: "Deleting bookmark...",
          success: "Deleted bookmark successfully",
        },
      },

      // Update
      update: "Update Bookmark",
      updating: "Updating bookmark...",
      updateSuccess: "Bookmark updated successfully",
      updateFailed: "Bookmark update failed",
    },

    // List Related
    list: {
      favorites: "Favorites",
      openFavorites: "Open Favorites",
      searchInFavorites: "Search in Favorites...",
      noFavorites: {
        title: "No bookmarks found",
        description: "No bookmarks in favorites",
      },
      archived: "Archived",
      openArchived: "Open Archived",
      searchInArchived: "Search in Archived...",
      openList: "Open List",
      deleteList: "Delete List",
      deleteConfirm: "Are you sure you want to delete list {name}?",
      searchInList: "Search in {name}...",
      noBookmarks: {
        title: "No bookmarks found",
        description: "No bookmarks in this list",
      },
      noArchived: {
        title: "No archived bookmarks",
        description: "No archived bookmarks found",
      },
    },

    // Tags Related
    tags: {
      searchPlaceholder: "Search tags",
      detail: {
        name: "Tag name",
        id: "Tag ID",
        totalBookmarks: "Total bookmarks",
        source: "Source",
      },
      actions: {
        viewBookmarks: "View bookmarks",
        openInBrowser: "View in Browser",
        copyTagName: "Copy tag name",
        copyTagId: "Copy tag ID",
        deleteTag: "Delete tag",
      },
      toast: {
        delete: {
          loading: "Deleting tag...",
          success: "Tag deleted successfully",
          error: "Tag deletion failed",
        },
      },
    },

    // Bookmark Item
    bookmarkItem: {
      untitled: "Untitled",
      untitledImage: "Untitled Image",
      metadata: {
        content: "Content",
        createdAt: "Created At",
        tags: "Tags",
        filename: "Filename",
        description: "Description",
      },
      actions: {
        viewDetail: "View Detail",
        copyContent: "Copy Content",
        refresh: "Refresh List",
        clearCache: "Clear Cache",
        delete: "Delete",
        viewImage: "View Image",
        openLink: "Open Link",
        copyLink: "Copy Link",
      },
      toast: {
        delete: {
          title: "Delete Bookmark",
          loading: "Please wait...",
          success: "Bookmark deleted",
          error: "Bookmark deletion failed",
        },
      },
    },

    // Bookmark List
    bookmarkList: {
      title: "Bookmarks ({{count}})",
      searchPlaceholder: "Search bookmarks...",
      searchResults: (searchText: string, count: number) => `Search results: ${searchText} (${count})`,
      filterResults: (filterText: string, count: number) => `Filter results: ${filterText} (${count})`,
      loading: {
        title: "Loading...",
        description: "Please wait...",
      },
      emptySearch: {
        title: "No bookmarks found",
        description: "No bookmarks in this search",
      },
      onlineSearch: {
        title: (searchText: string) => `Online search: ${searchText}`,
        action: (searchText: string) => `Online search: ${searchText}`,
      },
      toast: {
        cleanCache: {
          loading: "Clearing cache...",
          success: "Cache cleared",
          error: "Cache clearing failed",
        },
      },
    },
  },

  zh: {
    // 全局
    loading: "加载中...",
    pleaseWait: "请稍等...",
    refreshingBookmarks: "正在刷新书签...",
    bookmarksRefreshed: "书签已刷新",
    searchBookmarks: "搜索书签...",

    // 通用操作和消息
    common: {
      delete: "删除",
      deleting: "删除中...",
      deleteSuccess: "删除成功",
      deleteFailed: "删除失败",
      deleteCancel: "已取消删除",
      viewInBrowser: "在浏览器中查看",
      copyId: "复制 ID",
      open: "打开",
      search: "搜索",
      empty: {
        title: "暂无内容",
        description: "列表为空",
      },
    },

    // 书签相关
    bookmark: {
      // 创建
      create: "创建书签",
      creating: "创建中...",
      createSuccess: "创建成功",
      createFailed: "创建失败",

      // 类型和字段
      type: "类型",
      typeText: "纯文本",
      typeLink: "URL 链接",
      content: "内容",
      contentRequired: "请输入内容",
      contentTooLong: "内容不能超过2500字符",
      contentPlaceholder: "输入文本内容（最多2500字符）",
      url: "URL",
      urlInvalid: "请输入有效的 URL",
      urlPlaceholder: "输入 URL",
      note: "备注",
      notePlaceholder: "输入备注（可选）",

      // 标题
      title: "书签详情",
      untitled: "无标题",
      untitledImage: "无标题图片",
      originalTitle: "原标题",
      customTitle: "自定义标题",
      titlePlaceholder: "输入标题",

      list: "列表",
      defaultListPlaceholder: "默认",

      // 分区
      sections: {
        summary: "📝 摘要",
        note: "📒 笔记",
      },

      // 操作
      actions: {
        openInBrowser: "在浏览器中打开",
        previewInDashboard: "在控制台中预览",
        openLink: "打开链接",
        copyLink: "复制链接",
        copyContent: "复制内容",
        aiSummary: "AI 摘要",
        favorite: "收藏",
        unfavorite: "取消收藏",
        archive: "归档",
        unarchive: "取消归档",
        delete: "删除",
        edit: "编辑",
      },

      // 元数据
      metadata: {
        status: "状态",
        tags: "标签",
        createdAt: "创建时间",
        description: "描述",
        content: "内容",
        summary: "摘要",
        filename: "文件名",
        note: "备注",
      },

      // 状态
      status: {
        favorited: "已收藏",
        unfavorited: "未收藏",
        archived: "已归档",
        unarchived: "未归档",
        summarized: "AI 摘要",
        unsummarized: "无摘要",
      },

      // 提示消息
      toast: {
        summarize: {
          title: "生成摘要",
          loading: "正在生成摘要...",
          success: "摘要生成成功",
        },
        update: {
          title: "更新书签",
          loading: "更新中...",
          success: "更新成功",
        },
        delete: {
          title: "删除书签",
          loading: "删除中...",
          success: "删除成功",
        },
      },

      // 更新
      update: "更新书签",
      updating: "更新中...",
      updateSuccess: "更新成功",
      updateFailed: "更新失败",
    },

    // 列表相关
    list: {
      favorites: "收藏夹",
      openFavorites: "打开收藏夹",
      searchInFavorites: "在收藏夹中搜索...",
      noFavorites: {
        title: "暂无收藏",
        description: "收藏夹中暂无书签",
      },
      archived: "已归档",
      openArchived: "打开已归档",
      searchInArchived: "在已归档中搜索...",
      openList: "打开列表",
      deleteList: "删除列表",
      deleteConfirm: "确定要删除列表 {name} 吗？",
      searchInList: "在 {name} 中搜索...",
      noBookmarks: {
        title: "暂无书签",
        description: "列表中暂无书签",
      },
      noArchived: {
        title: "暂无归档",
        description: "暂无已归档的书签",
      },
    },

    // 标签相关
    tags: {
      searchPlaceholder: "搜索标签",
      detail: {
        name: "标签名称",
        id: "标签 ID",
        totalBookmarks: "书签总数",
        source: "来源",
      },
      actions: {
        viewBookmarks: "查看相关书签",
        openInBrowser: "在浏览器中查看",
        copyTagName: "复制标签名称",
        copyTagId: "复制标签 ID",
        deleteTag: "删除标签",
      },
      toast: {
        delete: {
          loading: "删除中...",
          success: "删除成功",
          error: "删除失败",
        },
      },
    },

    // 书签项
    bookmarkItem: {
      untitled: "无标题",
      untitledImage: "无标题图片",
      metadata: {
        content: "内容",
        createdAt: "创建时间",
        tags: "标签",
        filename: "文件名",
        description: "描述",
      },
      actions: {
        viewDetail: "查看详情",
        copyContent: "复制内容",
        refresh: "刷新列表",
        clearCache: "清除缓存",
        delete: "删除",
        viewImage: "查看图片",
        openLink: "打开链接",
        copyLink: "复制链接",
      },
      toast: {
        delete: {
          title: "删除书签",
          loading: "请稍等...",
          success: "删除成功",
          error: "删除失败",
        },
      },
    },

    // 书签列表
    bookmarkList: {
      title: "书签列表（{{count}}）",
      searchPlaceholder: "搜索书签...",
      searchResults: (searchText: string, count: number) => `搜索结果：${searchText}（共 ${count} 个）`,
      filterResults: (filterText: string, count: number) => `筛选结果：${filterText}（共 ${count} 个）`,
      loading: {
        title: "加载中...",
        description: "请稍等...",
      },
      emptySearch: {
        title: "未找到书签",
        description: "请尝试其他关键词",
      },
      onlineSearch: {
        title: (searchText: string) => `在线搜索：${searchText}`,
        action: (searchText: string) => `在线搜索：${searchText}`,
      },
      toast: {
        cleanCache: {
          loading: "清除缓存中...",
          success: "缓存已清除",
          error: "清除缓存失败",
        },
      },
    },
  },
};
