/**
 * usePagination hook for managing paginated data
 * Provides pagination controls and data slicing for large datasets
 */

import { useState, useMemo, useCallback } from "react";

export interface PaginationOptions {
  itemsPerPage?: number;
  initialPage?: number;
}

export interface PaginationResult<T> {
  // Current page data
  items: T[];

  // Pagination state
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;

  // Pagination info
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;

  // Pagination controls
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  setItemsPerPage: (count: number) => void;

  // Helper methods
  isCurrentPage: (page: number) => boolean;
  getPageNumbers: () => number[];
  getPageInfo: () => string;
}

/**
 * Hook for managing pagination of data arrays
 */
export function usePagination<T>(data: T[], options: PaginationOptions = {}): PaginationResult<T> {
  const { itemsPerPage: initialItemsPerPage = 20, initialPage = 1 } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPageState] = useState(initialItemsPerPage);

  // Calculate pagination values
  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Ensure current page is valid
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  // Calculate slice indices
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  // Get current page items
  const items = useMemo(() => {
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);

  // Pagination state
  const hasNextPage = safePage < totalPages;
  const hasPreviousPage = safePage > 1;

  // Navigation functions
  const goToPage = useCallback(
    (page: number) => {
      const newPage = Math.min(Math.max(1, page), totalPages);
      setCurrentPage(newPage);
    },
    [totalPages],
  );

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [hasPreviousPage]);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const setItemsPerPage = useCallback(
    (count: number) => {
      const newCount = Math.max(1, Math.min(1000, count)); // Reasonable limits
      setItemsPerPageState(newCount);

      // Adjust current page to maintain roughly the same position
      const currentFirstItemIndex = (safePage - 1) * itemsPerPage;
      const newPage = Math.max(1, Math.floor(currentFirstItemIndex / newCount) + 1);
      setCurrentPage(newPage);
    },
    [safePage, itemsPerPage],
  );

  // Helper functions
  const isCurrentPage = useCallback(
    (page: number) => {
      return page === safePage;
    },
    [safePage],
  );

  const getPageNumbers = useCallback((): number[] => {
    const pages: number[] = [];
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if there aren't too many
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, last page, current page, and pages around current
      pages.push(1);

      const start = Math.max(2, safePage - 2);
      const end = Math.min(totalPages - 1, safePage + 2);

      if (start > 2) {
        pages.push(-1); // Ellipsis marker
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push(-1); // Ellipsis marker
      }

      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  }, [totalPages, safePage]);

  const getPageInfo = useCallback((): string => {
    if (totalItems === 0) {
      return "No items";
    }

    const start = startIndex + 1;
    const end = endIndex;

    return `${start}-${end} of ${totalItems}`;
  }, [startIndex, endIndex, totalItems]);

  return {
    items,
    currentPage: safePage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    setItemsPerPage,
    isCurrentPage,
    getPageNumbers,
    getPageInfo,
  };
}

/**
 * Hook for server-side pagination
 */
export interface ServerPaginationOptions {
  initialPage?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number, itemsPerPage: number) => void;
}

export interface ServerPaginationResult {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  totalItems: number;

  hasNextPage: boolean;
  hasPreviousPage: boolean;

  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  setItemsPerPage: (count: number) => void;

  isCurrentPage: (page: number) => boolean;
  getPageNumbers: () => number[];
  getPageInfo: () => string;
}

export function useServerPagination(totalItems: number, options: ServerPaginationOptions = {}): ServerPaginationResult {
  const { initialPage = 1, itemsPerPage: initialItemsPerPage = 20, onPageChange } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPageState] = useState(initialItemsPerPage);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const hasNextPage = safePage < totalPages;
  const hasPreviousPage = safePage > 1;

  const goToPage = useCallback(
    (page: number) => {
      const newPage = Math.min(Math.max(1, page), totalPages);
      setCurrentPage(newPage);
      onPageChange?.(newPage, itemsPerPage);
    },
    [totalPages, itemsPerPage, onPageChange],
  );

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      const newPage = safePage + 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage, itemsPerPage);
    }
  }, [hasNextPage, safePage, itemsPerPage, onPageChange]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      const newPage = safePage - 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage, itemsPerPage);
    }
  }, [hasPreviousPage, safePage, itemsPerPage, onPageChange]);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
    onPageChange?.(1, itemsPerPage);
  }, [itemsPerPage, onPageChange]);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
    onPageChange?.(totalPages, itemsPerPage);
  }, [totalPages, itemsPerPage, onPageChange]);

  const setItemsPerPage = useCallback(
    (count: number) => {
      const newCount = Math.max(1, Math.min(1000, count));
      setItemsPerPageState(newCount);

      const currentFirstItemIndex = (safePage - 1) * itemsPerPage;
      const newPage = Math.max(1, Math.floor(currentFirstItemIndex / newCount) + 1);
      setCurrentPage(newPage);
      onPageChange?.(newPage, newCount);
    },
    [safePage, itemsPerPage, onPageChange],
  );

  const isCurrentPage = useCallback(
    (page: number) => {
      return page === safePage;
    },
    [safePage],
  );

  const getPageNumbers = useCallback((): number[] => {
    const pages: number[] = [];
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      const start = Math.max(2, safePage - 2);
      const end = Math.min(totalPages - 1, safePage + 2);

      if (start > 2) {
        pages.push(-1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push(-1);
      }

      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  }, [totalPages, safePage]);

  const getPageInfo = useCallback((): string => {
    if (totalItems === 0) {
      return "No items";
    }

    const start = (safePage - 1) * itemsPerPage + 1;
    const end = Math.min(safePage * itemsPerPage, totalItems);

    return `${start}-${end} of ${totalItems}`;
  }, [safePage, itemsPerPage, totalItems]);

  return {
    currentPage: safePage,
    itemsPerPage,
    totalPages,
    totalItems,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    setItemsPerPage,
    isCurrentPage,
    getPageNumbers,
    getPageInfo,
  };
}
