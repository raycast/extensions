import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  LocalStorage,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { Client } from "@notionhq/client";

interface DB {
  id: string;
  title: string;
}

interface Form {
  project: FormValue;
  keystone: FormValue;
  task: FormValue;
  event: FormValue;
  journal: FormValue;
  timer: FormValue;
  link: FormValue;
}

interface FormValue {
  id: string;
  title: string;
}

const SelectDBsForm = ({ notion }: { notion: Client | undefined }) => {
  const [dbs, setDbs] = useState<DB[]>([]);

  const SearchDBs = async () => {
    if (notion === undefined) return;
    await notion
      ?.search({
        filter: {
          value: "database",
          property: "object",
        },
      })
      .then((res) => {
        const newDbs: DB[] = [];
        res.results.forEach((res) => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const title = res.title[0].plain_text;
          const db: DB = {
            id: res.id,
            title: title,
          };
          newDbs.push(db);
        });
        setDbs(newDbs);
      })
      .catch((e) => {
        showFailureToast(e, { title: "Database Error" });
      });
  };

  const SubmitForm = async (e: Form) => {
    for (const [key, value] of Object.entries(e)) {
      LocalStorage.setItem(key, value);
    }
    LocalStorage.setItem("linked", true);
    await showToast({ title: "All Databases Set !", style: Toast.Style.Success });
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  };

  useEffect(() => {
    if (notion === undefined) return;
    SearchDBs();
  }, [notion]);

  const FormDropDown = ({ id, name }: { id: string; name: string }) => {
    return (
      <Form.Dropdown id={id} title={name}>
        {dbs.map((db) => {
          return <Form.Dropdown.Item key={db.id} title={db.title} value={db.id} />;
        })}
      </Form.Dropdown>
    );
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={SubmitForm} />
        </ActionPanel>
      }
    >
      <Form.Description title="" text="You have to select the relevant databases from the Notion Pilot page" />
      <Form.Description title="" text="Please, quit and go back to the form, as the dbs are loaded" />
      <FormDropDown id={"project"} name="Projects DB" />
      <FormDropDown id={"keystone"} name="Keystones DB" />
      <FormDropDown id={"todo"} name="Todos DB" />
      <FormDropDown id={"event"} name="Events DB" />
      <FormDropDown id={"journal"} name="Journals DB" />
      <FormDropDown id={"timer"} name="Timers DB" />
      <FormDropDown id={"link"} name="Links DB" />
    </Form>
  );
};

export default SelectDBsForm;
