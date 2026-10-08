import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProviderProps } from "../providers/types";

export interface Record {
  id: string;
  created_at: string;
  type: string;
  props: ProviderProps;
}

export interface ProvidersHook {
  data: Record[];
  isLoading: boolean;
  addOrUpdate: (arg: Record) => Promise<void>;
  remove: (arg: Record) => Promise<void>;
  selected: Record | undefined;
  setSelected: (record: Record) => void;
}

function encrypt(plaintext: string): string {
  const key = 42;
  let encrypted = "";
  for (let i = 0; i < plaintext.length; i++) {
    const charCode = plaintext.charCodeAt(i);
    const encryptedCharCode = charCode ^ key;
    encrypted += String.fromCharCode(encryptedCharCode);
  }
  return encrypted;
}

export function useProviders(): ProvidersHook {
  //FIXME: data will reset to empty array when any exception occurs in init useEffect
  const [data, setData] = useState<Record[]>([]);
  const countRef = useRef(data);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [selected, setSelected] = useState<Record>();

  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>("providers");
      const _selected = await LocalStorage.getItem<string>("selected");

      const data = (stored ? JSON.parse(stored) : []).map((item: Record) => {
        return {
          ...item,
          props: {
            ...item.props,
            apikey: item.props.apikey ? encrypt(item.props.apikey) : item.props.apikey,
          },
        };
      });
      const selected = data.find((item: Record) => item.id == _selected);
      setData(data);
      setSelected(selected);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (data) {
      if (countRef.current != data) {
        countRef.current = data;
      }
      LocalStorage.setItem(
        "providers",
        JSON.stringify(
          data.map((item) => {
            return {
              ...item,
              props: {
                ...item.props,
                apikey: item.props.apikey ? encrypt(item.props.apikey) : item.props.apikey,
              },
            };
          }),
        ),
      );
    } else {
      LocalStorage.setItem("providers", JSON.stringify(data));
    }
  }, [data]);

  useEffect(() => {
    if (selected) {
      LocalStorage.setItem("selected", selected.id);
    }
  }, [selected]);

  const addOrUpdate = useCallback(
    async (record: Record) => {
      const data = countRef.current;
      if (data) {
        if (data.length == 0) {
          setSelected(record);
        }
        if (data.find((item) => item.id == record.id)) {
          const newData = data.map((item) => {
            if (item.id === record.id) {
              return record;
            }
            return item;
          });
          setData(newData);
        } else {
          setData([record, ...data]);
        }
      }
    },
    [setData, data],
  );

  const remove = useCallback(
    async (record: Record) => {
      const data = countRef.current;
      if (data) {
        const toast = await showToast({
          title: "Removing record...",
          style: Toast.Style.Animated,
        });
        const newData: Record[] = data.filter((item) => item.id !== record.id);
        setData(newData);
        if (selected == record) {
          if (newData.length > 0) {
            setSelected(newData[0]);
          }
        }
        toast.title = "Record removed!";
        toast.style = Toast.Style.Success;
      }
    },
    [setData, data],
  );

  return useMemo(
    () => ({ data, isLoading, addOrUpdate, remove, selected, setSelected }),
    [data, isLoading, addOrUpdate, remove, selected, setSelected],
  );
}
