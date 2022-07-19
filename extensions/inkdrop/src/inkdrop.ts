import fetch, { Headers } from "node-fetch";
import { useEffect, useState } from "react";

export type InkdropOption = {
  address: string;
  port: string;
  username: string;
  password: string;
};

export type DraftNote = {
  doctype: string;
  bookId: `book:${string}`;
  status: "none" | "active" | "onHold" | "completed" | "dropped";
  share: "private" | "public";
  title: string;
  body: string;
  tags: `tag:${string}`[];
};

export type Note = DraftNote & {
  createdAt: number;
  updatedAt: number;
  numOfTasks: number;
  numOfCheckedTasks: number;
  pinned: boolean;
  _id: `note:${string}`;
  _rev: string;
};

export type Tag = {
  count: number;
  color: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  _id: `tag:${string}`;
  _rev: string;
};

export type Book = {
  parentBookId: `book:${string}`;
  updatedAt: number;
  createdAt: number;
  name: string;
  _id: `book:${string}`;
  _rev: string;
};

export type Status = {
  _id: "none" | "active" | "onHold" | "completed" | "dropped";
  name: "None" | "Active" | "On Hold" | "Completed" | "Dropped";
};

export const getInkdrop = (option: InkdropOption) => {
  const buildHeader = () => {
    const { username, password } = option;
    const headers = new Headers();
    headers.set("Authorization", "Basic " + Buffer.from(`${username}:${password}`).toString("base64"));
    return headers;
  };

  const fetcher = <T>(key: string): Promise<T> => {
    const { address, port } = option;
    const headers = buildHeader();
    return fetch(`http://${address}:${port}${key}`, { headers }).then((res) => res.json() as unknown as T);
  };

  const useNotes = (keyword: string) => {
    const [notes, setNotes] = useState<Note[]>();
    const [error, setError] = useState();

    useEffect(() => {
      const query = new URLSearchParams({ keyword, sort: "updatedAt", descending: "true" }).toString();
      fetcher<Note[]>(`/notes?${query}`).then(setNotes).catch(setError);
    }, [keyword]);

    return {
      notes,
      isLoading: !notes && !error,
      error,
    };
  };

  const saveNote = (note: DraftNote) => {
    const { address, port } = option;
    const headers = buildHeader();
    headers.set("Content-Type", "application/json");
    const body = JSON.stringify(note);
    return fetch(`http://${address}:${port}/notes`, { headers, method: "POST", body }).then((res) => res.json());
  };

  const useTags = () => {
    const [tags, setTags] = useState<Tag[]>();
    const [error, setError] = useState();

    useEffect(() => {
      fetcher<Tag[]>("/tags").then(setTags).catch(setError);
    }, []);

    return {
      tags,
      isLoading: !tags && !error,
      error,
    };
  };

  const useBooks = () => {
    const [books, setBooks] = useState<Book[]>();
    const [error, setError] = useState();

    useEffect(() => {
      fetcher<Book[]>("/books")
        .then((books) => books.sort((r, l) => (r.name.toLowerCase() > l.name.toLowerCase() ? 1 : -1)))
        .then(setBooks)
        .catch(setError);
    }, []);

    return {
      books,
      isLoading: !books && !error,
      error,
    };
  };

  const useStatuses = () => {
    const statuses = [
      { _id: "none", name: "None" },
      { _id: "active", name: "Active" },
      { _id: "onHold", name: "On Hold" },
      { _id: "completed", name: "Completed" },
      { _id: "dropped", name: "Dropped" },
    ];

    return { statuses: statuses as Status[], isLoading: false, error: false };
  };

  return { useNotes, saveNote, useBooks, useTags, useStatuses };
};
