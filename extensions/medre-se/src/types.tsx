export enum ResponseType {
    Definition = "definition",
    Verse = "verse",
    Chapter = "chapter",
    Book = "book",
    Page = "page",
    VerseRange = "verse-range",
}

export interface Definition {
    title: string;
    summary: string;
    meaning: string;
    example: string;
    reference: string;
}


export interface Chapter {
    name: string;
    info: string;
    revelation: string;
}

export interface Verse {
    name: string;
    chapter: number;
    order: number;
    original: string;
    translation: string;
}

export interface VerseRange {
    name: string;
    chapter: number;
    from: number;
    to: number;
    verses: [{
        original: string;
        translation: string;
    }]
}

export interface Book {
    order: number;
    fromPage: number;
    toPage: number;
    numberOfChapters: number;
    numberOfVerses: number;
}

export interface Page {
    no: number;
    content: [{
        chapter: number;
        name: string;
        numberOfVerses: number;
    }]
}

export interface Entry {
    type: ResponseType;
    data: Definition | Chapter | Verse | Book | Page | VerseRange;
}

export interface APIResponse {
    entries: Entry[];
    limit: number;
    meta: {
        hits: number;
        pages: number;
        current: number;
        next?: string;
        previous?: string;
    };
}