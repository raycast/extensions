// src/bookstack-api.ts
import axios from 'axios';
import { getPreferenceValues } from '@raycast/api';

export const { baseUrl } = getPreferenceValues<Preferences>();

interface Preferences {
    baseUrl: string;
    tokenId: string;
    tokenSecret: string;
}

interface SearchResult {
    data: SearchResultItem[];
}

export interface SearchResultItem {
    id: number;
    name: string;
    url: string;
    type: string;
}

const preferences: Preferences = getPreferenceValues<Preferences>();
const apiClient = axios.create({
    baseURL: preferences.baseUrl,
    headers: {
        'Authorization': `Token ${preferences.tokenId}:${preferences.tokenSecret}`
    }
});

export async function searchBookStack(query: string): Promise<SearchResultItem[]> {
    const response = await apiClient.get<SearchResult>('/api/search', {
        params: { query }
    });
    if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
    }
    throw new Error('Search results are not in expected format');
}

export async function getAllBooks(): Promise<SearchResultItem[]> {
    const response = await apiClient.get('/api/books');
    if (response.data && Array.isArray(response.data.data)) {
        return response.data.data.map((book) => ({
            id: book.id,
            name: book.name,
            description: book.description,
            url: `/books/${book.slug}`
        }));
    }
    throw new Error('Books data is not in the expected format');
}

export async function getAllShelves(): Promise<SearchResultItem[]> {
    const response = await apiClient.get('/api/shelves');
    if (response.data && Array.isArray(response.data.data)) {
        return response.data.data.map((shelf) => ({
            id: shelf.id,
            name: shelf.name,
            description: shelf.description,
            url: `/shelves/${shelf.slug}`
        }));
    }
    throw new Error('Shelves data is not in the expected format');
}