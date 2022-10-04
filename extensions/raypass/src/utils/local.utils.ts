import type { LocalDocumentReference, LocalDocumentReferences } from "../types";
import { LocalStorage } from "@raycast/api";
import { docs } from ".";
import { documentStore } from "../context";

export const referenceKey = "doc_refs";

const createLocalDocumentReference = async (): Promise<void> => {
  try {
    await LocalStorage.setItem(referenceKey, JSON.stringify([]));
    return;
  } catch (error) {
    throw new Error("Could not create local document reference");
  }
};

const removeLocalDocumentReference = async ({ documentName }: { documentName: string }): Promise<void> => {
  const { all, selected } = await getLocalDocumentReferences([documentName]);
  if (selected.length === 0) return;

  if (selected[0].isActive) {
    throw new Error(`Switch active document before deleting (${documentName})`);
  }

  const newRefs = all.filter((ref) => ref.name !== documentName);

  try {
    await LocalStorage.setItem(referenceKey, JSON.stringify(newRefs));
    return;
  } catch (error) {
    throw new Error(`Could not remove local document reference for ${documentName}`);
  }
};

const appendLocalDocumentReference = async ({
  name,
  location,
  isEncrypted,
}: Omit<LocalDocumentReference, "isActive">): Promise<LocalDocumentReference> => {
  try {
    const { all } = await getLocalDocumentReferences([name]);
    const ref = { name, location, isEncrypted, isActive: true };
    const refs =
      all.length !== 0
        ? all
            .map((ref) => {
              return { ...ref, isActive: false };
            })
            .concat(ref)
        : [ref];

    await LocalStorage.setItem(referenceKey, JSON.stringify(refs));

    return ref;
  } catch (error) {
    console.log(error);
    throw new Error(`Failed to edit local document reference (${name})`);
  }
};

const editLocalDocumentReference = async ({
  name,
  data,
}: {
  name: string;
  data: Partial<LocalDocumentReference>;
}): Promise<LocalDocumentReference> => {
  try {
    const { all, refCreated } = await getLocalDocumentReferences([name]);
    if (refCreated) throw new Error("Cannot edit docs that do not exist");

    const updatedRefs =
      all.length !== 0
        ? all.map((ref) => {
            if (ref.name === name) return { ...ref, ...data };
            if (data.isActive !== undefined) return { ...ref, isActive: false };
            return ref;
          })
        : [];

    await LocalStorage.setItem(referenceKey, JSON.stringify(updatedRefs));

    return updatedRefs.filter((ref) => ref.name === name)[0];
  } catch (error) {
    console.log(error);
    throw new Error(`Failed to edit local document reference (${name})`);
  }
};

const refreshLocalDocumentReferences = async (): Promise<LocalDocumentReferences> => {
  try {
    const { documents } = await docs.index();
    await LocalStorage.setItem(referenceKey, JSON.stringify(documents));
    documentStore.setState({ ref: documents.filter((ref) => ref.isActive)[0] });
    return documents;
  } catch (error) {
    throw new Error("Could not refresh local document references");
  }
};

export const getActiveLocalDocumentReference = async (): Promise<LocalDocumentReference | null> => {
  const { all, refCreated } = await getLocalDocumentReferences();
  if (refCreated) return null;
  return all.find((ref) => ref.isActive) || null;
};

const getLocalDocumentReferences = async (
  names?: Array<string>
): Promise<{ all: LocalDocumentReferences; selected: LocalDocumentReferences; refCreated: boolean }> => {
  const refs = await LocalStorage.getItem<string>(referenceKey);
  if (!refs) {
    await createLocalDocumentReference();
    return { all: [], selected: [], refCreated: true };
  }
  const parsedRefs = JSON.parse(refs) as LocalDocumentReferences;
  return {
    all: parsedRefs,
    selected: names ? parsedRefs.filter((ref) => names.includes(ref.name)) : [],
    refCreated: false,
  };
};

export const local = {
  docs: {
    create: createLocalDocumentReference,
    refresh: refreshLocalDocumentReferences,
    remove: removeLocalDocumentReference,
    append: appendLocalDocumentReference,
    get: getLocalDocumentReferences,
    active: getActiveLocalDocumentReference,
    edit: editLocalDocumentReference,
  },
  user: {}, // user preferences (e.g. default document, use password)
};
