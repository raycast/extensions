import { Client } from "@notionhq/client";
import { Action, ActionPanel, Detail, LocalStorage, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import React, { useEffect, useState } from "react";
import { br, h1 } from "../../tools/markdownTools";

interface DB {
  id: string;
  title: string;
}

const DBs_NAME = ["Projects", "Keystones", "Todos", "Events", "Journals", "Timers", "Links"];

const CheckDBDetail = ({ notion }: { notion: Client | undefined }) => {
  const [dbs, setDbs] = useState<DB[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [state, setState] = useState<string>("loading");

  const getDBs = async () => {
    setIsLoading(true);
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
        setIsLoading(false);
      })
      .catch((e) => {
        showFailureToast(e, { title: "Database Error" });
      });
  };

  const CheckState = () => {
    if (isLoading) {
      setState("loading");
      return;
    }
    if (dbs.length === 0) {
      setState("no_dbs");
      return;
    }

    const testDBs = [...dbs];
    const testNames = [...DBs_NAME];
    let okCount = 0;
    testDBs.forEach((db) => {
      if (testNames.includes(db.title)) {
        const index = testNames.indexOf(db.title);
        testNames.splice(index, 1);
        okCount += 1;
      }
    });
    if (okCount === DBs_NAME.length) {
      setState("ok");
      return;
    } else {
      setState("error_dbs");
      return;
    }
  };

  useEffect(() => {
    getDBs();
  }, [notion]);

  useEffect(() => {
    CheckState();
  }, [dbs, isLoading]);

  const Markdown = () => {
    let text;
    switch (state) {
      case "loading":
        text =
          "We are loading the page for configuration." +
          br +
          "Please wait. If nothing occurs, please refresh the page.";
        break;
      case "no_dbs":
        text =
          "We did not find any database." +
          br +
          "Please, refresh the view or check that the integration is correctly linked into Notion." +
          br +
          "You can find the docs [here](pilot-docs.romubuntu.dev).";
        break;
      case "ok":
        text = "We are all set for the configuration ! " + br + "Press Enter to finish it and start using Pilot !";
        break;
      case "error_dbs":
        text =
          "We can find databases but it seems some are missing" +
          br +
          "Are you sure that you duplicate our template page and linked it to the integration in Notion ?" +
          br +
          "Ensure that all child database pages are linked to the integration." +
          br +
          "You can find the docs [here](pilot-docs.romubuntu.dev).";
        break;
      default:
        break;
    }

    return h1("Welcome into the Pilot Extension") + br + text;
  };

  const ValidationAction = () => {
    const validate = async () => {
      dbs.forEach((db) => {
        LocalStorage.setItem(db.title, db.id);
      });
      LocalStorage.setItem("linked", true);
      await showToast({ title: "All Databases Set !", style: Toast.Style.Success });
      popToRoot({ clearSearchBar: true });
    };

    return state == "ok" ? <Action title="Validate " onAction={() => validate()} /> : <></>;
  };

  return (
    <Detail
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ValidationAction />
        </ActionPanel>
      }
      markdown={Markdown()}
    />
  );
};

export default CheckDBDetail;
