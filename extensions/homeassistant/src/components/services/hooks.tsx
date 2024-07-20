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
  value?: any;
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
      const selectorKeys = Object.keys(s);
      console.log("selector keys:", selectorKeys);
      for (const sk of selectorKeys) {
        switch (sk) {
          case "object":
            {
              result.push({
                id: k,
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
                type: sk,
                meta: v,
              });
            }
            break;
          case "number":
            {
              result.push({
                id: k,
                toYaml: (value) => {
                  return Number.parseFloat(value);
                },
                fromYaml: (value) => {
                  if (value && !Number.isNaN(value)) {
                    return `${value}`;
                  }
                },
                type: sk,
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
            }
            break;
          case "boolean":
            {
              result.push({
                id: k,
                toYaml: (value) => {
                  return value;
                },
                fromYaml: (value) => {
                  return value;
                },
                type: sk,
                meta: v,
                validator: (value) => {
                  if (!value) {
                    if (v.required === true) {
                      return "Required";
                    }
                    return undefined;
                  }
                  return undefined;
                },
              });
            }
            break;
          case "entity":
            {
              result.push({
                id: k,
                toYaml: (value) => {
                  return value;
                },
                fromYaml: (value) => {
                  return value;
                },
                type: sk,
                meta: v,
                validator: (userValue) => {
                  if (v.required === true && !userValue) {
                    return "Required";
                  }
                  return undefined;
                },
              });
            }
            break;
          case "select":
            {
              result.push({
                id: k,
                value: undefined,
                toYaml: (value) => {
                  return value;
                },
                fromYaml: (value) => {
                  return value;
                },
                type: sk,
                meta: v,
                validator: (userValue) => {
                  if (v.required === true && !userValue) {
                    return "Required";
                  }
                  return undefined;
                },
              });
            }
            break;
          case "color_temp":
            {
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
                type: sk,
                meta: v,
                validator: (userValue) => {
                  if (!userValue) {
                    if (v.required) {
                      return "Required";
                    }
                    return undefined;
                  }
                  const n = Number.parseFloat(userValue);
                  if (Number.isNaN(n)) {
                    return "Not a valid number";
                  }
                  const ct = s.color_temp;
                  const max = ct?.max;
                  if (max !== undefined && max !== null && n > max) {
                    return `Maximum is ${max} `;
                  }
                  const min = ct?.min;
                  if (min !== undefined && min !== null && n < min) {
                    return `Minimum is ${min} `;
                  }
                  return undefined;
                },
              });
            }
            break;
          case "text":
          case "floor":
          case "area":
          case "config_entry":
          case "icon":
          case "label":
          case "device":
          case "theme":
          case "color_rgb":
          case "addon":
          case "backup_location":
          case "time":
          case "conversation_agent":
          case "datetime":
            {
              result.push({
                id: k,
                toYaml: (value) => {
                  return value;
                },
                fromYaml: (value) => {
                  return value;
                },
                type: sk,
                meta: v,
                validator: (userValue) => {
                  if (v.required === true && !userValue) {
                    return "Required";
                  }
                  return undefined;
                },
              });
            }
            break;
          default:
            {
              // handle all not validate selectors and handle them as string types
              result.push({
                id: k,
                toYaml: (value) => {
                  return value;
                },
                fromYaml: (value) => {
                  return value;
                },
                type: sk,
                meta: v,
                validator: (userValue) => {
                  if (v.required === true && !userValue) {
                    return "Required";
                  }
                  return undefined;
                },
              });
            }
            break;
        }
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
