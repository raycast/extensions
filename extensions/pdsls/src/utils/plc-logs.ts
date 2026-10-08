import { IndexedEntry, Service } from "@atcute/did-plc";

export type DiffEntry =
  | {
      type: "identity_created";
      orig: IndexedEntry;
      at: string;
      rotationKeys: string[];
      verificationMethods: Record<string, string>;
      alsoKnownAs: string[];
      services: Record<string, { type: string; endpoint: string }>;
    }
  | {
      type: "identity_tombstoned";
      orig: IndexedEntry;
      at: string;
    }
  | {
      type: "rotation_key_added";
      orig: IndexedEntry;
      at: string;
      rotation_key: string;
    }
  | {
      type: "rotation_key_removed";
      orig: IndexedEntry;
      at: string;
      rotation_key: string;
    }
  | {
      type: "verification_method_added";
      orig: IndexedEntry;
      at: string;
      method_id: string;
      method_key: string;
    }
  | {
      type: "verification_method_removed";
      orig: IndexedEntry;
      at: string;
      method_id: string;
      method_key: string;
    }
  | {
      type: "verification_method_changed";
      orig: IndexedEntry;
      at: string;
      method_id: string;
      prev_method_key: string;
      next_method_key: string;
    }
  | {
      type: "handle_added";
      orig: IndexedEntry;
      at: string;
      handle: string;
    }
  | {
      type: "handle_removed";
      orig: IndexedEntry;
      at: string;
      handle: string;
    }
  | {
      type: "handle_changed";
      orig: IndexedEntry;
      at: string;
      prev_handle: string;
      next_handle: string;
    }
  | {
      type: "service_added";
      orig: IndexedEntry;
      at: string;
      service_id: string;
      service_type: string;
      service_endpoint: string;
    }
  | {
      type: "service_removed";
      orig: IndexedEntry;
      at: string;
      service_id: string;
      service_type: string;
      service_endpoint: string;
    }
  | {
      type: "service_changed";
      orig: IndexedEntry;
      at: string;
      service_id: string;
      prev_service_type: string;
      next_service_type: string;
      prev_service_endpoint: string;
      next_service_endpoint: string;
    };

export const createOperationHistory = (entries: IndexedEntry[]): DiffEntry[] => {
  const history: DiffEntry[] = [];

  for (let idx = 0, len = entries.length; idx < len; idx++) {
    const entry = entries[idx];
    const op = entry.operation;

    if (op.type === "create") {
      history.push({
        type: "identity_created",
        orig: entry,
        at: entry.createdAt,
        rotationKeys: [op.recoveryKey, op.signingKey],
        verificationMethods: { atproto: op.signingKey },
        alsoKnownAs: [`at://${op.handle}`],
        services: {
          atproto_pds: {
            type: "AtprotoPersonalDataServer",
            endpoint: op.service,
          },
        },
      });
    } else if (op.type === "plc_operation") {
      const prevOp = findLastMatching(entries, (entry) => !entry.nullified, idx - 1)?.operation;

      let oldRotationKeys: string[];
      let oldVerificationMethods: Record<string, string>;
      let oldAlsoKnownAs: string[];
      let oldServices: Record<string, Service>;

      if (!prevOp) {
        history.push({
          type: "identity_created",
          orig: entry,
          at: entry.createdAt,
          rotationKeys: op.rotationKeys,
          verificationMethods: op.verificationMethods,
          alsoKnownAs: op.alsoKnownAs,
          services: op.services,
        });

        continue;
      } else if (prevOp.type === "create") {
        oldRotationKeys = [prevOp.recoveryKey, prevOp.signingKey];
        oldVerificationMethods = { atproto: prevOp.signingKey };
        oldAlsoKnownAs = [`at://${prevOp.handle}`];
        oldServices = {
          atproto_pds: {
            type: "AtprotoPersonalDataServer",
            endpoint: prevOp.service,
          },
        };
      } else if (prevOp.type === "plc_operation") {
        oldRotationKeys = prevOp.rotationKeys;
        oldVerificationMethods = prevOp.verificationMethods;
        oldAlsoKnownAs = prevOp.alsoKnownAs;
        oldServices = prevOp.services;
      } else {
        continue;
      }

      // Check for rotation key changes
      {
        const additions = difference(op.rotationKeys, oldRotationKeys);
        const removals = difference(oldRotationKeys, op.rotationKeys);

        for (const key of additions) {
          history.push({
            type: "rotation_key_added",
            orig: entry,
            at: entry.createdAt,
            rotation_key: key,
          });
        }

        for (const key of removals) {
          history.push({
            type: "rotation_key_removed",
            orig: entry,
            at: entry.createdAt,
            rotation_key: key,
          });
        }
      }

      // Check for verification method changes
      {
        for (const id in op.verificationMethods) {
          if (!(id in oldVerificationMethods)) {
            history.push({
              type: "verification_method_added",
              orig: entry,
              at: entry.createdAt,
              method_id: id,
              method_key: op.verificationMethods[id],
            });
          } else if (op.verificationMethods[id] !== oldVerificationMethods[id]) {
            history.push({
              type: "verification_method_changed",
              orig: entry,
              at: entry.createdAt,
              method_id: id,
              prev_method_key: oldVerificationMethods[id],
              next_method_key: op.verificationMethods[id],
            });
          }
        }

        for (const id in oldVerificationMethods) {
          if (!(id in op.verificationMethods)) {
            history.push({
              type: "verification_method_removed",
              orig: entry,
              at: entry.createdAt,
              method_id: id,
              method_key: oldVerificationMethods[id],
            });
          }
        }
      }

      // Check for handle changes
      if (op.alsoKnownAs.length === 1 && oldAlsoKnownAs.length === 1) {
        if (op.alsoKnownAs[0] !== oldAlsoKnownAs[0]) {
          history.push({
            type: "handle_changed",
            orig: entry,
            at: entry.createdAt,
            prev_handle: oldAlsoKnownAs[0],
            next_handle: op.alsoKnownAs[0],
          });
        }
      } else {
        const additions = difference(op.alsoKnownAs, oldAlsoKnownAs);
        const removals = difference(oldAlsoKnownAs, op.alsoKnownAs);

        for (const handle of additions) {
          history.push({
            type: "handle_added",
            orig: entry,
            at: entry.createdAt,
            handle: handle,
          });
        }

        for (const handle of removals) {
          history.push({
            type: "handle_removed",
            orig: entry,
            at: entry.createdAt,
            handle: handle,
          });
        }
      }

      // Check for service changes
      {
        for (const id in op.services) {
          if (!(id in oldServices)) {
            history.push({
              type: "service_added",
              orig: entry,
              at: entry.createdAt,
              service_id: id,
              service_type: op.services[id].type,
              service_endpoint: op.services[id].endpoint,
            });
          } else if (!dequal(op.services[id], oldServices[id])) {
            history.push({
              type: "service_changed",
              orig: entry,
              at: entry.createdAt,
              service_id: id,
              prev_service_type: oldServices[id].type,
              next_service_type: op.services[id].type,
              prev_service_endpoint: oldServices[id].endpoint,
              next_service_endpoint: op.services[id].endpoint,
            });
          }
        }

        for (const id in oldServices) {
          if (!(id in op.services)) {
            history.push({
              type: "service_removed",
              orig: entry,
              at: entry.createdAt,
              service_id: id,
              service_type: oldServices[id].type,
              service_endpoint: oldServices[id].endpoint,
            });
          }
        }
      }
    } else if (op.type === "plc_tombstone") {
      history.push({
        type: "identity_tombstoned",
        orig: entry,
        at: entry.createdAt,
      });
    }
  }

  return history;
};

function findLastMatching<T, S extends T>(arr: T[], predicate: (item: T) => item is S, start?: number): S | undefined;
function findLastMatching<T>(arr: T[], predicate: (item: T) => boolean, start?: number): T | undefined;
function findLastMatching<T>(arr: T[], predicate: (item: T) => boolean, start: number = arr.length - 1): T | undefined {
  for (let i = start, v: T; i >= 0; i--) {
    if (predicate((v = arr[i]))) {
      return v;
    }
  }

  return undefined;
}

function difference<T>(a: readonly T[], b: readonly T[]): T[] {
  const set = new Set(b);
  return a.filter((value) => !set.has(value));
}

const dequal = (a: unknown, b: unknown): boolean => {
  let ctor: unknown;
  let len: number;

  if (a === b) {
    return true;
  }

  if (a && b && (ctor = (a as object).constructor) === (b as object).constructor) {
    if (ctor === Array) {
      const aArr = a as unknown[];
      const bArr = b as unknown[];
      if ((len = aArr.length) === bArr.length) {
        while (len--) {
          if (!dequal(aArr[len], bArr[len])) {
            return false;
          }
        }
      }

      return len === -1;
    } else if (!ctor || ctor === Object) {
      len = 0;
      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;

      for (const key in aObj) {
        len++;

        if (!(key in bObj) || !dequal(aObj[key], bObj[key])) {
          return false;
        }
      }

      return Object.keys(bObj).length === len;
    }
  }

  return a !== a && b !== b;
};

export const groupBy = <K, T>(items: T[], keyFn: (item: T, index: number) => K): Map<K, T[]> => {
  const map = new Map<K, T[]>();

  for (let idx = 0, len = items.length; idx < len; idx++) {
    const val = items[idx];
    const key = keyFn(val, idx);

    const list = map.get(key);

    if (list !== undefined) {
      list.push(val);
    } else {
      map.set(key, [val]);
    }
  }

  return map;
};
