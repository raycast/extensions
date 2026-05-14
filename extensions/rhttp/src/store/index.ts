import { atom } from "nanostores";
import { z } from "zod";
import { Collection, collectionSchema, NewCollection, NewRequest, Request } from "../types";
import { randomUUID } from "crypto";
import { createFileAdapter, createLocalStorageAdapter, persistentAtom } from "zod-persist";
import path from "path";
import { environment, LocalStorage } from "@raycast/api";
import { DEFAULT_COLLECTION_NAME } from "~/constants";

export const $collections = persistentAtom([], {
  storage: createFileAdapter(path.join(environment.supportPath, "collections.json")),
  key: "collections",
  schema: z.array(collectionSchema),
});

// --- A helper to create the default collection object ---
function createDefaultCollectionObject(): Collection {
  const newId = randomUUID();
  return {
    id: newId,
    title: DEFAULT_COLLECTION_NAME,
    requests: [],
    headers: [],
    lastActiveEnvironmentId: null,
  };
}

/**
 * Checks if collections are empty on startup and creates a default one if needed.
 */
export async function initializeDefaultCollection() {
  await $collections.ready;
  if ($collections.get().length === 0) {
    const defaultCollection = createDefaultCollectionObject();
    try {
      await $collections.setAndFlush([defaultCollection]);
      await $currentCollectionId.setAndFlush(defaultCollection.id);
    } catch (error) {
      console.error("Failed to initialize default collection:", error);
      throw error; // Let caller handle
    }
  }
}
// initializeDefaultCollection();

export const $currentCollectionId = persistentAtom<string | null>(null, {
  storage: createLocalStorageAdapter(LocalStorage),
  key: "currentCollectionId",
  isEqual(a, b) {
    return a === b;
  },
});

export const $selectedRequestId = atom<string | null>(null);

// --- ACTIONS ---

/**
 * Creates a new collection and adds it to the store.
 */
export async function createCollection(data: NewCollection | Collection) {
  const newCollection: Collection = {
    ...data,
    requests: "requests" in data ? data.requests : [],
    id: randomUUID(),
  };

  const newState = [...$collections.get(), newCollection];

  // Validation
  z.array(collectionSchema).parse(newState);
  await $collections.setAndFlush(newState);

  // Set current collection to be the new collection.
  await $currentCollectionId.setAndFlush(newCollection.id);
}

/**
 * Updates an existing collection in the store.
 */
export async function updateCollection(collectionId: string, data: Partial<Collection>) {
  const updatedCollections = $collections.get().map((c) => {
    if (c.id === collectionId) {
      // Merge the existing collection with the new data
      return { ...c, ...data };
    }
    return c;
  });

  // Validation
  z.array(collectionSchema).parse(updatedCollections);
  await $collections.setAndFlush(updatedCollections);
}

/**
 * Deletes a collection, and if it's the last one, creates a new default collection.
 */
export async function deleteCollection(collectionId: string) {
  const newState = $collections.get().filter((c) => c.id !== collectionId);

  if (newState.length === 0) {
    // If we just deleted the last collection, create a new default one.
    const defaultCollection = createDefaultCollectionObject();
    newState.push(defaultCollection);
    // And make sure to select it
    $currentCollectionId.set(defaultCollection.id);
  } else {
    // If other collections remain, and the deleted one was selected, clear the selection.
    if ($currentCollectionId.get() === collectionId) {
      $currentCollectionId.set(null);
    }
  }

  // No need to validate here, as we are only removing/replacing data
  await $collections.setAndFlush(newState);
}

/**
 * Creates a new request and adds it to the specified collection.
 */
export async function createRequest(collectionId: string, data: NewRequest) {
  const newRequest: Request = {
    ...data,
    id: randomUUID(),
  };

  const updatedCollections = $collections.get().map((c) => {
    if (c.id === collectionId) {
      return { ...c, requests: [...c.requests, newRequest] };
    }
    return c;
  });

  // Validation
  z.array(collectionSchema).parse(updatedCollections);
  await $collections.setAndFlush(updatedCollections);
  return newRequest;
}

/**
 * Updates an existing request within a specific collection.
 */
export async function updateRequest(collectionId: string, requestId: string, data: Partial<Request>) {
  const updatedCollections = $collections.get().map((c) => {
    if (c.id === collectionId) {
      const updatedRequests = c.requests.map((r) => {
        if (r.id === requestId) {
          return { ...r, ...data };
        }
        return r;
      });
      return { ...c, requests: updatedRequests };
    }
    return c;
  });

  z.array(collectionSchema).parse(updatedCollections);
  await $collections.setAndFlush(updatedCollections);
}

/**
 * Deletes a request from a specific collection.
 */
export async function deleteRequest(collectionId: string, requestId: string) {
  const newState = $collections.get().map((c) => {
    if (c.id === collectionId) {
      // Filter out the request with the matching ID
      const updatedRequests = c.requests.filter((r) => r.id !== requestId);
      return { ...c, requests: updatedRequests };
    }
    return c;
  });

  // No need to validate here, as we are only removing data
  await $collections.setAndFlush(newState);
}

/**
 * Moves a request from one collection to another.
 */
export async function moveRequest(requestId: string, sourceCollectionId: string, destinationCollectionId: string) {
  const currentCollections = $collections.get();
  let requestToMove: Request | undefined;

  // First, find the request and remove it from the source collection
  const collectionsWithoutRequest = currentCollections.map((c) => {
    if (c.id === sourceCollectionId) {
      requestToMove = c.requests.find((r) => r.id === requestId);
      const updatedRequests = c.requests.filter((r) => r.id !== requestId);
      return { ...c, requests: updatedRequests };
    }
    return c;
  });

  // If we couldn't find the request, something is wrong, so we stop.
  if (!requestToMove) {
    console.error("Could not find request to move.");
    return;
  }

  // Now, add the request to the destination collection
  const finalCollections = collectionsWithoutRequest.map((c) => {
    if (c.id === destinationCollectionId) {
      const updatedRequests = [...c.requests, requestToMove!];
      return { ...c, requests: updatedRequests };
    }
    return c;
  });

  // Validate the final state before saving
  z.array(collectionSchema).parse(finalCollections);
  await $collections.setAndFlush(finalCollections);
}
