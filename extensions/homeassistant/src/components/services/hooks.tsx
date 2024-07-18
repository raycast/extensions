import { useCachedPromise } from "@raycast/utils";
import { getHomeAssistantServices, HAServiceField, HAServiceMeta } from "./utils";
import { parse } from "path";
import { useState, useEffect } from "react";

export interface HAServiceCall {
  domain: string;
  service: string;
  name: string;
  description: string;
  meta: HAServiceMeta;
}

export function useServiceCalls() {
  const { data, error, isLoading } = useCachedPromise(async () => {
    const result: HAServiceCall[] = [];
    const services = await getHomeAssistantServices();
    if (services) {
      for (const s of services) {
        if (s.services) {
          for (const [service, meta] of Object.entries(s.services)) {
            result.push({ domain: s.domain, service, name: meta.name, description: meta.name, meta: meta });
          }
        }
      }
    }
    return result;
  });
  return { data, error, isLoading };
}

export interface FieldState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  type: string;
  meta: HAServiceField;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toYaml: (value: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fromYaml: (text: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validator: (userValue: any) => string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //selector: any
}

export function useHAServiceCallFormData(serviceCall: HAServiceCall | undefined) {
  const [fields, setFields] = useState<FieldState[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userData, setUserData] = useState<Record<string, any>>({});
  const [userDataError, setUserDataError] = useState<Record<string, string | undefined>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setUserDataByKey = (key: string, value: any) => {
    setUserData({ ...userData, [key]: value });
    const field = fields.find((f) => f.id === key);
    if (field) {
      setUserDataError({ ...userDataError, [key]: field.validator(value) });
    } else {
      console.error(`Could not find field with key ${key}`);
    }
  };

  useEffect(() => {
    if (!serviceCall) {
      return;
    }
    const result: FieldState[] = [];
    if (serviceCall.meta.target?.entity !== undefined) {
      result.push({
        id: "entity_id",
        value: undefined,
        toYaml: (value) => {
          return value;
        },
        fromYaml: (value) => {
          return value;
        },
        validator: () => {
          return undefined;
        },
        type: "target_entity",
        meta: { description: "", example: "" },
      });
    }
    for (const [k, v] of Object.entries(serviceCall.meta.fields)) {
      const s = v.selector;
      if (!s) {
        continue;
      }
      if (s.object !== undefined) {
        result.push({
          id: k,
          value: undefined,
          toYaml: (value) => {
            return value;
          },
          fromYaml: (value) => {
            return value;
          },
          validator: (userValue) => {
            if (v.required === true && !userValue) {
              return "Required";
            }
            if (userValue && userValue.trim().length > 0) {
              try {
                parse(userValue);
              } catch (error) {
                return "No valid yaml";
              }
            }
          },
          type: "object",
          meta: v,
        });
      } else if (s.text !== undefined) {
        result.push({
          id: k,
          value: undefined,
          toYaml: (value) => {
            return value;
          },
          fromYaml: (value) => {
            return value;
          },
          type: "text",
          meta: v,
          validator: (val) => {
            if (v.required === true && !val) {
              return "Required";
            }
            return undefined;
          },
        });
      } else if (s.number !== undefined) {
        result.push({
          id: k,
          value: undefined,
          toYaml: (value) => {
            return Number.parseFloat(value);
          },
          fromYaml: (value) => {
            if (value && !Number.isNaN(value)) {
              return `${value}`;
            }
          },
          type: "number",
          meta: v,
          validator: (value) => {
            if (!value) {
              if (v.required === true) {
                return "Required";
              }
              return undefined;
            }
            const n = Number.parseFloat(value);
            if (Number.isNaN(n)) {
              return "Not a valid number";
            }
            const max = s?.number?.max;
            const min = s?.number?.min;
            if (max !== undefined && max !== null && n > max) {
              return `Maximum is ${max} `;
            }
            if (min !== undefined && min !== null && n < min) {
              return `Minimum is ${min} `;
            }
            return undefined;
          },
        });
      } else if (s.entity !== undefined) {
        result.push({
          id: k,
          value: undefined,
          toYaml: (value) => {
            return value;
          },
          fromYaml: (value) => {
            return value;
          },
          type: "entity",
          meta: v,
          validator: (userValue) => {
            if (v.required === true && !userValue) {
              return "Required";
            }
            return undefined;
          },
        });
      } else if (s.select !== undefined) {
        result.push({
          id: k,
          value: undefined,
          toYaml: (value) => {
            return value;
          },
          fromYaml: (value) => {
            return value;
          },
          type: "select",
          meta: v,
          validator: (userValue) => {
            if (v.required === true && !userValue) {
              return "Required";
            }
            return undefined;
          },
        });
      } else if (s?.text !== undefined) {
        result.push({
          id: k,
          value: undefined,
          toYaml: (value) => {
            return value;
          },
          fromYaml: (value) => {
            return value;
          },
          type: "text",
          meta: v,
          validator: (userValue) => {
            if (v.required === true && !userValue) {
              return "Required";
            }
            return undefined;
          },
        });
      } else if (s?.area !== undefined) {
        result.push({
          id: k,
          value: undefined,
          toYaml: (value) => {
            return value;
          },
          fromYaml: (value) => {
            return value;
          },
          type: "area",
          meta: v,
          validator: (userValue) => {
            if (v.required === true && !userValue) {
              return "Required";
            }
            return undefined;
          },
        });
      } else if (s?.floor !== undefined) {
        result.push({
          id: k,
          value: undefined,
          toYaml: (value) => {
            return value;
          },
          fromYaml: (value) => {
            return value;
          },
          type: "floor",
          meta: v,
          validator: (userValue) => {
            if (v.required === true && !userValue) {
              return "Required";
            }
            return undefined;
          },
        });
      } else if (s?.config_entry !== undefined) {
        result.push({
          id: k,
          value: undefined,
          toYaml: (value) => {
            return value;
          },
          fromYaml: (value) => {
            return value;
          },
          type: "config_entry",
          meta: v,
          validator: (userValue) => {
            if (v.required === true && !userValue) {
              return "Required";
            }
            return undefined;
          },
        });
      } else if (s?.icon !== undefined) {
        result.push({
          id: k,
          value: undefined,
          toYaml: (value) => {
            return value;
          },
          fromYaml: (value) => {
            return value;
          },
          type: "icon",
          meta: v,
          validator: (userValue) => {
            if (v.required === true && !userValue) {
              return "Required";
            }
            return undefined;
          },
        });
      } else if (s?.label !== undefined) {
        result.push({
          id: k,
          value: undefined,
          toYaml: (value) => {
            return value;
          },
          fromYaml: (value) => {
            return value;
          },
          type: "label",
          meta: v,
          validator: (userValue) => {
            if (v.required === true && !userValue) {
              return "Required";
            }
            return undefined;
          },
        });
      } else if (s?.device !== undefined) {
        result.push({
          id: k,
          value: undefined,
          toYaml: (value) => {
            return value;
          },
          fromYaml: (value) => {
            return value;
          },
          type: "device",
          meta: v,
          validator: (userValue) => {
            if (v.required === true && !userValue) {
              return "Required";
            }
            return undefined;
          },
        });
      } else if (s?.theme !== undefined) {
        result.push({
          id: k,
          value: undefined,
          toYaml: (value) => {
            return value;
          },
          fromYaml: (value) => {
            return value;
          },
          type: "theme",
          meta: v,
          validator: (userValue) => {
            if (v.required === true && !userValue) {
              return "Required";
            }
            return undefined;
          },
        });
      } else {
        console.error(`Unknown field type '${k}' `, v);
      }
    }
    setFields(result);
    setUserData({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initialDataError: Record<string, any> = {};
    for (const f of result) {
      const ne = f.validator(f.value);
      if (ne !== undefined) {
        initialDataError[f.id] = ne;
      }
    }
    setUserDataError(initialDataError);
  }, [serviceCall]);

  return {
    fields,
    userData,
    setUserData,
    setUserDataByKey,
    userDataError,
  };
}
