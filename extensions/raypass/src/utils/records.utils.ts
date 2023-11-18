import type { Record, LocalDocumentReference } from "../types";
import fs from "node:fs";
import { nanoid } from "nanoid";
import { docs, local, c } from ".";

const getRecords = async ({
  password,
}: {
  password?: string;
}): Promise<{ ref: LocalDocumentReference | null; records: Record[] | null }> => {
  const ref = await local.docs.active();
  if (!ref) {
    return { ref: null, records: null };
  }

  try {
    const { records } = await docs.get({ documentName: ref.name, password: ref.isEncrypted ? password : undefined });
    return { ref, records };
  } catch (error) {
    return { ref, records: [] };
  }
};

const editRecord = async ({
  id,
  record,
  password,
}: {
  id: string;
  record: Omit<Record, "id">;
  password?: string;
}): Promise<{ success: boolean }> => {
  const { ref, records: currentRecords } = await getRecords({ password });

  if (!ref) throw new Error("No active document");
  if (!currentRecords) throw new Error("No records found in active document");

  const updatedDocument = currentRecords.map((currentRecord) => {
    if (currentRecord.id === id) {
      return { ...currentRecord, ...record };
    }
    return currentRecord;
  });

  try {
    const payload = JSON.stringify(updatedDocument);
    const data = ref.isEncrypted && password ? c.encrypt(payload, password) : payload;

    await fs.promises.writeFile(ref.location, data, "utf-8");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

const deleteRecord = async ({ id, password }: { id: string; password?: string }): Promise<{ success: boolean }> => {
  const { ref, records } = await getRecords({ password });
  if (!ref) throw new Error("No active document");
  if (!records) throw new Error("No records found in active document");

  const updatedDocument = records.filter((record) => record.id !== id);

  if (ref.isEncrypted && !password) {
    return { success: false };
  }

  try {
    const payload = JSON.stringify(updatedDocument);
    const data = ref.isEncrypted && password ? c.encrypt(payload, password) : payload;
    await fs.promises.writeFile(ref.location, data, "utf-8");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

const createRecord = async ({ record, password }: { record: Omit<Record, "id">; password?: string }): Promise<void> => {
  const activeRef = await local.docs.active();
  if (!activeRef) {
    throw new Error("No active document");
  }

  const { name, isEncrypted } = activeRef;

  if (isEncrypted && !password) {
    throw new Error("Document is encrypted, please provide password");
  }

  const { location, records: currentRecords } = await docs.get({
    documentName: name,
    password: isEncrypted ? password : undefined,
  });
  const updatedDocument = [...currentRecords, { ...record, id: nanoid() }];

  try {
    const payload = JSON.stringify(updatedDocument);
    const data = isEncrypted && password ? c.encrypt(payload, password) : payload;

    await fs.promises.writeFile(location, data, "utf-8");

    return;
  } catch (error) {
    throw new Error(`Could not append to document at ${location}`);
  }
};

export const records = {
  create: createRecord,
  edit: editRecord,
  delete: deleteRecord,
  get: getRecords,
};
