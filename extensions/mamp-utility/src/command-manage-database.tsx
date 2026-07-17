import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { create_database, delete_database, export_database, get_databases, import_database } from "./utils-db";
import { useEffect, useState } from "react";
import { getCurrentFormattedTime } from "./utils-time";
import { get_pref_apachePort, get_pref_mamp_path } from "./utils-preference";
import { sort_db } from "./utils-db";
import { system_db } from "./utils-db";
import { open } from "@raycast/api";

/**
 * React functional component that renders a list of databases.
 * It fetches the databases using the 'get_databases' function on component mount and sorts them using the 'sort_db' function from './utils-db'.
 *
 * @returns JSX element representing a list of databases with ListDB components for each database.
 *
 * @remarks
 * - No input parameters.
 * - Uses React hooks to manage state with useState for 'dbs' array.
 * - Utilizes useEffect hook to fetch databases on component mount.
 * - Renders a loading indicator if 'dbs' array is empty.
 * - Sorts the databases alphabetically before mapping them to ListDB components.
 *
 * @note This function assumes the existence of 'get_databases' and 'sort_db' functions.
 */
export default function Command() {
  const [dbs, set_DBs] = useState<string[]>([]);
  const [error, set_error] = useState<boolean>(false);
  const [isLoading, set_isLoading] = useState<boolean>(true);

  setTimeout(() => {
    if (dbs.length == 0) {
      set_isLoading(false);
      set_error(true);
    } else {
      set_isLoading(false);
    }
  }, 1000);

  useEffect(() => {
    get_databases(set_DBs, set_isLoading, set_error);
  }, []);

  return (
    <List isLoading={isLoading}>
      {error && (
        <List.EmptyView
          title="Failed to Fetch Database"
          description="Please make sure you have started the MAMP instance."
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action
                title="Open MAMP"
                onAction={() => {
                  open(get_pref_mamp_path());
                }}
              />
            </ActionPanel>
          }
        />
      )}
      {dbs
        .sort((a, b) => {
          return sort_db(a, b);
        })
        ?.map((db) => {
          return <ListDB key={db} db={db}></ListDB>;
        })}
    </List>
  );
}

/**
 * This function renders a form component for creating a database. It takes in props as input, which can be of type any or null.
 * Parameters:
 * -  props: any|null - Props to be passed to the component.
 * Returns:
 * -  JSX Element: A form component with the following features:
 *     - enableDrafts set to false.
 *     - navigationTitle displaying "Create Database".
 *     - isLoading set to true.
 *     - actions containing a submit button with the title "Submit" that triggers the create_database function with the provided data.
 *     - a text field for entering the database name with the following properties:
 * */
function FormCreateDB() {
  return (
    <Form
      enableDrafts={false}
      navigationTitle={"Create Database"}
      isLoading={true}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={(data) => {
              create_database(data.db_name);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id={"db_name"}
        autoFocus={true}
        title={"Database Name"}
        defaultValue={`${getCurrentFormattedTime()}_`}
      />
    </Form>
  );
}
function FormImportDB(props: { db: string }) {
  // let cp_text: string | undefined = "";
  // Clipboard.readText().then((data: string | undefined) => {
  // 	cp_text = data;
  // 	return;
  // });
  return (
    <Form
      enableDrafts={false}
      navigationTitle={"Import Database"}
      isLoading={true}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={(data) => {
              import_database(data.db_name, data.path);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id={"db_name"} title={"Database Name"} value={props.db} />
      {/* <Form.TextField
                id          ={"path"}
                autoFocus   ={true}
                title       ={"Importing File \n(PATH)"}
                value       ={cp_text==undefined?"":cp_text}
            /> */}
      <Form.FilePicker id={"path"} autoFocus={true} title={"Importing File \n(PATH)"} />
    </Form>
  );
}

/**
 * Generates an Action Panel component for managing database actions in a web application.
 * @param props An object containing the 'db' property as a string specifying the database name.
 * @returns JSX element representing the Action Panel component with sections for Clipboard, Create/Delete, and Export/Import actions.
 */
function ListDB_Actions(props: { db: string }) {
  const { push } = useNavigation();
  const db = props.db;
  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open in phpMyAdmin"
        url={"http://localhost:" + get_pref_apachePort() + "/phpMyAdmin5/"}
      ></Action.OpenInBrowser>
      <ActionPanel.Section title="Database Operation">
        <Action
          title="Create Database"
          icon={Icon.PlusCircle}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() => {
            push(<FormCreateDB />);
          }}
        />
        <Action
          title="Delete Database"
          icon={Icon.MinusCircle}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            if (system_db.includes(db)) {
              confirmAlert({
                title: `Detected System Database  \n [ ${db} ]`,
                message: `Deletion may cause issue, please do it manually.`,
                icon: Icon.Warning,
                primaryAction: {
                  title: "Abort",
                  style: Alert.ActionStyle.Destructive,
                  onAction: () => {},
                },
              });
            } else {
              confirmAlert({
                title: `Confirm Delete Database \n [ ${db} ]`,
                icon: Icon.Trash,
                primaryAction: {
                  title: "Confirm",
                  style: Alert.ActionStyle.Destructive,
                  onAction: () => {
                    delete_database(db);
                  },
                },
              });
            }
          }}
        />
        <Action
          title="Export Database"
          icon={Icon.ArrowRightCircle}
          onAction={() => {
            showToast({
              title: "Exporting...",
              style: Toast.Style.Animated,
            });
            export_database(db);
          }}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
        />
        {/* <Action
                    title="Export Database (and Reveal in Finder)"
                    icon={Icon.ArrowRightCircle}
                    onAction={()=>{export_database(db, true);}}
                    shortcut={{modifiers:["cmd", "ctrl"], key:"s"}}
                /> */}
        <Action
          title="Import Database"
          icon={Icon.ArrowRightCircle}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
          onAction={() => {
            push(<FormImportDB db={db} />);
          }}
        />
        {/* <Action
                    title="Import Database (and Reveal in phpMyAdmin)"
                    icon={Icon.ArrowRightCircle}
                    onAction={()=>{}}
                    shortcut={{modifiers:["cmd", "ctrl"], key:"i"}}
                /> */}
      </ActionPanel.Section>
      <ActionPanel.Section title="Clipboard Operation">
        <Action.CopyToClipboard
          title="Copy 'settings.php' Configuration"
          content={`$databases['default']['default'] = array (\n\t'driver' => 'mysql',\n\t'database' => '${db}',\n\t'username' => 'root',\n\t'password' => 'root',\n\t'prefix' => '',\n\t'host' => '127.0.0.1',\n\t'port' => '8889',\n\t'namespace' => 'Drupal\\Core\\Database\\Driver\\mysql',\n\t'unix_socket' => '/Applications/MAMP/tmp/mysql/mysql.sock',\n);\n$settings['trusted_host_patterns'] = array();`}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Database Name"
          content={db}
          shortcut={{ modifiers: ["cmd", "ctrl"], key: "c" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

/**
 * Function to display a list item representing a database entry.
 *
 * @param props - The properties object containing the 'db' property specifying the database name.
 * @returns A List.Item component with the following properties:
 *  - key: set to the 'db' value
 *  - title: set to the 'db' value
 *  - icon: set based on whether 'db' is included in 'system_db' - Icon.MemoryChip for system databases, Icon.Person for user databases
 *  - accessories: an array containing a tag object with a value indicating whether the database is a system or user database, and a color representing this distinction
 *  - actions: rendered using the ListDB_Actions component with the 'db' value passed as a prop
 */
function ListDB(props: { db: string }) {
  const db = props.db;

  return (
    <List.Item
      key={db}
      title={db}
      icon={system_db.includes(db) ? Icon.MemoryChip : Icon.Person}
      accessories={[
        {
          tag: {
            value: system_db.includes(db) ? "system" : "user",
            color: system_db.includes(db) ? Color.Purple : Color.Green,
          },
        },
      ]}
      actions={<ListDB_Actions db={db} />}
    />
  );
}
