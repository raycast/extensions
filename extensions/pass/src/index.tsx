import { List, getPreferenceValues, Toast, showToast} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import * as recursive from "recursive-readdir";
import BadPasswordPath from "./errors/bad_password_path";

import GetPasswordDetails, { passwords_path_structure } from "./passwordDetails";
import { Preferences } from "./utils";


function ParsePassFileName(pass_file_path: string) {
  const password_store_name = "password-store/";
  const pass_id = pass_file_path.lastIndexOf("password-store/");
  let pass_path = pass_file_path.slice(pass_id);
  pass_path = pass_path.slice(password_store_name.length).slice(0, -4);
  return pass_path;
}

function LoadPassFilesList(PATH_TO_STORE: string) {
  const [files, setFiles] = useState<passwords_path_structure[]>([{ pass_file_name: "", pass_file_path: "" }]);
  const [error_loading, setError] = useState<boolean>(false)
  const OMMIT_FILES = [".git", ".*"];

  const loadPasswordsStore = useCallback(() => {
    recursive.default(PATH_TO_STORE, OMMIT_FILES, (err, files: string[]) => {
      console.error(err);``
      if(err){
        showToast({
          style: Toast.Style.Failure,
          title: "Could not load files",
        });
        setError(true)
        return
      }
      if(files.length > 0){
        setFiles(
          files.map((val) => {
            return { pass_file_name: ParsePassFileName(val), pass_file_path: val };
          }))
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "No files in store",
        });
      }
    });
  }, [files]);

  useEffect(() => {
    loadPasswordsStore();
  }, []);

  const listItems = files.map((pass_file: passwords_path_structure, index: number) => (
    <List.Item
      key={index}
      title={pass_file.pass_file_name}
      actions={
        <GetPasswordDetails pass_file_name={pass_file.pass_file_name} pass_file_path={pass_file.pass_file_path} />
      }
    />
  ));
    

  return !error_loading ? <List>{listItems}</List> : <BadPasswordPath />
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  return LoadPassFilesList(preferences.passwords_store_path);
}
