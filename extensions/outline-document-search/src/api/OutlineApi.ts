import fetch from "node-fetch";
import { Instance } from "../queryInstances";

export interface OutlineDocument {
  id: string;
  title: string;
  text?: string;
  url?: string;
  urlId?: string;
  collectionId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sort: {
    field: string;
    direction: string;
  };
}

export interface Share {
  id: string;
  documentId: string;
  url: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  documentId: string;
  data: {
    type: string;
    content: Array<{ type: string; text?: string }>;
  };
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface Revision {
  id: string;
  documentId: string;
  title: string;
  text: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
}

interface SearchResult {
  ranking: number;
  context: string;
  document: OutlineDocument;
}

interface SearchResponse {
  data: SearchResult[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

interface CollectionsResponse {
  data: Collection[];
  pagination: {
    limit: number;
    offset: number;
  };
}

interface CreateDocumentResponse {
  data: OutlineDocument;
}

/**
 * Centralized API client for Outline
 * Works with the Instance interface from the base extension
 */
export class OutlineApi {
  private instance: Instance;

  constructor(instance: Instance) {
    this.instance = instance;
  }

  private async request<T>(method: string, body: object): Promise<T> {
    const response = await fetch(`${this.instance.url}/api/${method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.instance.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Outline API error: ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  getDocumentUrl(doc: OutlineDocument): string {
    // Outline API returns a relative URL like "/doc/title-urlId"
    // We need to prepend the base URL
    if (doc.url) {
      // If url starts with http, it's already absolute
      if (doc.url.startsWith("http")) {
        return doc.url;
      }
      // Otherwise prepend base URL
      return `${this.instance.url}${doc.url}`;
    }

    // Fallback: construct URL from id if url field is missing
    return `${this.instance.url}/doc/${doc.id}`;
  }

  async searchDocuments(query: string): Promise<OutlineDocument[]> {
    const response = await this.request<SearchResponse>("documents.search", {
      query,
      limit: 20,
    });
    // Extract the document from each search result
    return response.data.map((result) => result.document);
  }

  async listDocuments(): Promise<OutlineDocument[]> {
    const response = await this.request<{ data: OutlineDocument[] }>("documents.list", {
      limit: 100,
    });
    return response.data;
  }

  async listCollections(): Promise<Collection[]> {
    const response = await this.request<CollectionsResponse>("collections.list", {
      limit: 100,
    });
    return response.data;
  }

  async createDocument(title: string, collectionId: string, text?: string): Promise<OutlineDocument> {
    const response = await this.request<CreateDocumentResponse>("documents.create", {
      title,
      collectionId,
      text: text || "",
      publish: true,
    });
    return response.data;
  }

  // Starred documents
  async getStarredDocuments(): Promise<OutlineDocument[]> {
    const response = await this.request<{
      data: { document: OutlineDocument }[];
    }>("stars.list", {
      limit: 100,
    });
    return response.data.map((item) => item.document);
  }

  async starDocument(id: string): Promise<void> {
    await this.request("documents.star", { id });
  }

  async unstarDocument(id: string): Promise<void> {
    await this.request("documents.unstar", { id });
  }

  // Recently viewed documents
  async getRecentDocuments(): Promise<OutlineDocument[]> {
    const response = await this.request<{ data: OutlineDocument[] }>("documents.viewed", {
      limit: 50,
    });
    return response.data;
  }

  // Collection documents
  async getCollectionDocuments(collectionId: string): Promise<OutlineDocument[]> {
    const response = await this.request<{ data: OutlineDocument[] }>("collections.documents", {
      id: collectionId,
      limit: 100,
    });
    return response.data;
  }

  // Document info
  async getDocumentInfo(id: string): Promise<OutlineDocument> {
    const response = await this.request<{ data: OutlineDocument }>("documents.info", {
      id,
    });
    return response.data;
  }

  // Update document
  async updateDocument(id: string, data: { title?: string; text?: string }): Promise<OutlineDocument> {
    const response = await this.request<{ data: OutlineDocument }>("documents.update", {
      id,
      ...data,
      publish: true,
    });
    return response.data;
  }

  // Move document
  async moveDocument(id: string, collectionId: string): Promise<OutlineDocument> {
    const response = await this.request<{ data: OutlineDocument }>("documents.move", {
      id,
      collectionId,
    });
    return response.data;
  }

  // Shares
  async listShares(documentId: string): Promise<Share[]> {
    const response = await this.request<{ data: Share[] }>("shares.list", {
      documentId,
    });
    return response.data;
  }

  async createShare(documentId: string): Promise<Share> {
    const response = await this.request<{ data: Share }>("shares.create", {
      documentId,
    });
    return response.data;
  }

  // Comments
  async listComments(documentId: string): Promise<Comment[]> {
    const response = await this.request<{ data: Comment[] }>("comments.list", {
      documentId,
    });
    return response.data;
  }

  async createComment(documentId: string, text: string): Promise<Comment> {
    const response = await this.request<{ data: Comment }>("comments.create", {
      documentId,
      data: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text }],
          },
        ],
      },
    });
    return response.data;
  }

  // Revisions
  async listRevisions(documentId: string): Promise<Revision[]> {
    const response = await this.request<{ data: Revision[] }>("revisions.list", {
      documentId,
      limit: 50,
    });
    return response.data;
  }

  async getRevision(id: string): Promise<Revision> {
    const response = await this.request<{ data: Revision }>("revisions.info", {
      id,
    });
    return response.data;
  }
}
