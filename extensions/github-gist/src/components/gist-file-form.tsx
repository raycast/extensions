import { Form } from "@raycast/api";
import React, { Dispatch, SetStateAction } from "react";
import { GistFile } from "../util/gist-utils";

export function GistFileForm(props: {
  index: number;
  array: GistFile[];
  useState: [GistFile[], Dispatch<SetStateAction<GistFile[]>>];
}) {
  const { index, array } = props;
  const [gistFiles, setGistFiles] = props.useState;
  return (
    <>
      <Form.Separator />
      <Form.TextField
        id={"file_name" + index}
        key={"file_name" + index}
        title={" Filename  " + (index + 1)}
        placeholder={"Filename include extension..."}
        value={array[index].filename}
        onChange={(newValue) => {
          const _gistFiles = [...gistFiles];
          _gistFiles[index].filename = newValue;
          setGistFiles(_gistFiles);
        }}
      />
      <Form.TextArea
        id={"file_content" + index}
        key={"file_content" + index}
        value={array[index].content}
        title={"Content"}
        placeholder={"File content can't be empty..."}
        onChange={(newValue) => {
          const _gistFiles = [...gistFiles];
          _gistFiles[index].content = newValue;
          setGistFiles(_gistFiles);
        }}
      />
    </>
  );
}
