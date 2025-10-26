/**
 * Background worker utilities for offloading heavy computations
 * Prevents main thread blocking during expensive operations
 */

interface WorkerMessage {
  id: string;
  type: "sort" | "filter" | "search";
  payload: unknown;
}

interface WorkerResponse {
  id: string;
  result?: unknown;
  error?: string;
}

class BackgroundWorkerManager {
  private worker: Worker | null = null;
  private isSupported: boolean;
  private pendingTasks = new Map<string, { resolve: (value: unknown) => void; reject: (reason: Error) => void }>();
  private taskId = 0;

  constructor() {
    this.isSupported = typeof Worker !== "undefined";

    if (this.isSupported) {
      this.initializeWorker();
    }
  }

  private initializeWorker() {
    // Create inline worker to avoid external file dependencies
    const workerScript = `
      // Background processing worker
      
      function sortItems(items, sortFn) {
        if (items.length <= 1000) {
          return [...items].sort(sortFn);
        }
        
        // Use efficient merge sort for large datasets
        return mergeSort([...items], sortFn);
      }
      
      function mergeSort(arr, compareFn) {
        if (arr.length <= 1) return arr;
        
        const mid = Math.floor(arr.length / 2);
        const left = mergeSort(arr.slice(0, mid), compareFn);
        const right = mergeSort(arr.slice(mid), compareFn);
        
        return merge(left, right, compareFn);
      }
      
      function merge(left, right, compareFn) {
        const result = [];
        let leftIndex = 0;
        let rightIndex = 0;
        
        while (leftIndex < left.length && rightIndex < right.length) {
          if (compareFn(left[leftIndex], right[rightIndex]) <= 0) {
            result.push(left[leftIndex]);
            leftIndex++;
          } else {
            result.push(right[rightIndex]);
            rightIndex++;
          }
        }
        
        return result.concat(left.slice(leftIndex), right.slice(rightIndex));
      }
      
      function filterItems(items, predicate) {
        return items.filter(predicate);
      }
      
      function searchItems(items, query, options = {}) {
        const lowerQuery = query.toLowerCase();
        
        // Simple text search for now - could be enhanced with Fuse.js
        return items.filter(item => {
          const searchFields = options.fields || ['title', 'name', 'app'];
          
          return searchFields.some(field => {
            const value = item[field];
            return value && value.toLowerCase().includes(lowerQuery);
          });
        });
      }
      
      self.addEventListener('message', (event) => {
        const { id, type, payload } = event.data;
        
        try {
          let result;
          
          switch (type) {
            case 'sort':
              result = sortItems(payload.items, payload.compareFn);
              break;
              
            case 'filter':
              result = filterItems(payload.items, payload.predicate);
              break;
              
            case 'search':
              result = searchItems(payload.items, payload.query, payload.options);
              break;
              
            default:
              throw new Error(\`Unknown task type: \${type}\`);
          }
          
          self.postMessage({ id, result });
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      });
    `;

    const blob = new Blob([workerScript], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);

    try {
      this.worker = new Worker(workerUrl);
      this.worker.addEventListener("message", this.handleWorkerMessage.bind(this));
      this.worker.addEventListener("error", this.handleWorkerError.bind(this));
    } catch (error) {
      console.warn("Failed to create web worker:", error);
      this.isSupported = false;
    } finally {
      URL.revokeObjectURL(workerUrl);
    }
  }

  private handleWorkerMessage(event: MessageEvent<WorkerResponse>) {
    const { id, result, error } = event.data;
    const task = this.pendingTasks.get(id);

    if (task) {
      this.pendingTasks.delete(id);

      if (error) {
        task.reject(new Error(error));
      } else {
        task.resolve(result);
      }
    }
  }

  private handleWorkerError(error: ErrorEvent) {
    console.error("Worker error:", error);

    // Reject all pending tasks
    for (const [id, task] of this.pendingTasks) {
      task.reject(new Error("Worker error occurred"));
      this.pendingTasks.delete(id);
    }
  }

  private generateTaskId(): string {
    return `task_${++this.taskId}_${Date.now()}`;
  }

  async sortInBackground<T>(items: T[], compareFn: (a: T, b: T) => number): Promise<T[]> {
    if (!this.isSupported || !this.worker) {
      // Fallback to main thread
      return [...items].sort(compareFn);
    }

    const id = this.generateTaskId();

    return new Promise((resolve, reject) => {
      this.pendingTasks.set(id, { resolve, reject });

      // Serialize the comparison function
      const compareFnString = compareFn.toString();

      this.worker!.postMessage({
        id,
        type: "sort",
        payload: { items, compareFn: compareFnString },
      } as WorkerMessage);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingTasks.has(id)) {
          this.pendingTasks.delete(id);
          reject(new Error("Worker task timeout"));
        }
      }, 10000);
    });
  }

  async filterInBackground<T>(items: T[], predicate: (item: T) => boolean): Promise<T[]> {
    if (!this.isSupported || !this.worker) {
      return items.filter(predicate);
    }

    const id = this.generateTaskId();

    return new Promise((resolve, reject) => {
      this.pendingTasks.set(id, { resolve, reject });

      const predicateString = predicate.toString();

      this.worker!.postMessage({
        id,
        type: "filter",
        payload: { items, predicate: predicateString },
      } as WorkerMessage);

      setTimeout(() => {
        if (this.pendingTasks.has(id)) {
          this.pendingTasks.delete(id);
          reject(new Error("Worker task timeout"));
        }
      }, 10000);
    });
  }

  async searchInBackground<T>(items: T[], query: string, options: { fields?: string[] } = {}): Promise<T[]> {
    if (!this.isSupported || !this.worker) {
      const lowerQuery = query.toLowerCase();
      const searchFields = options.fields || ["title", "name", "app"];

      return items.filter((item) => {
        return searchFields.some((field) => {
          const value = (item as Record<string, unknown>)[field];
          return value && value.toLowerCase().includes(lowerQuery);
        });
      });
    }

    const id = this.generateTaskId();

    return new Promise((resolve, reject) => {
      this.pendingTasks.set(id, { resolve, reject });

      this.worker!.postMessage({
        id,
        type: "search",
        payload: { items, query, options },
      } as WorkerMessage);

      setTimeout(() => {
        if (this.pendingTasks.has(id)) {
          this.pendingTasks.delete(id);
          reject(new Error("Worker task timeout"));
        }
      }, 10000);
    });
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Reject all pending tasks
    for (const [id, task] of this.pendingTasks) {
      task.reject(new Error("Worker terminated"));
      this.pendingTasks.delete(id);
    }
  }

  getStatus() {
    return {
      isSupported: this.isSupported,
      isActive: !!this.worker,
      pendingTasks: this.pendingTasks.size,
    };
  }
}

// Export singleton instance
export const backgroundWorker = new BackgroundWorkerManager();

// Cleanup on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    backgroundWorker.terminate();
  });
}
