import { Form } from "@raycast/api";

export interface CommandForm {
  title: string;
  textfield: string;
  textarea: string;
  dropdown: string;
}

export interface FileType {
  name: string;
  icon: string;
}

export const QuickTypeFileTypes: FileType[] = [
  { name: "Swift", icon: "file_type_swift.svg" },
  { name: "C#", icon: "file_type_csharp.svg" },
  { name: "C++", icon: "file_type_cpp.svg" },
  { name: "Crytstal", icon: "file_type_crystal.svg" },
  { name: "Dart", icon: "file_type_dartlang.svg" },
  { name: "Elm", icon: "file_type_elm.svg" },
  { name: "Flow", icon: "file_type_flow.svg" },
  { name: "Go", icon: "file_type_go.svg" },
  { name: "Haskell", icon: "file_type_haskell.svg" },
  { name: "Java", icon: "file_type_java.svg" },
  { name: "JavaScript PropTypes", icon: "file_type_javascript.svg" },
  { name: "JavaScript", icon: "file_type_javascript.svg" },
  { name: "Kotlin", icon: "file_type_kotlin.svg" },
  { name: "Objective-C", icon: "file_type_objectivec.svg" },
  { name: "Pike", icon: "default_file.svg" },
  { name: "Python", icon: "file_type_python.svg" },
  { name: "Ruby", icon: "file_type_ruby.svg" },
  { name: "Rust", icon: "file_type_rust.svg" },
  { name: "TypeScript", icon: "file_type_typescript.svg" },
];

export function FileTypeItem(props: { fileType: FileType }) {
  const fileType = props.fileType;
  return <Form.Dropdown.Item key={fileType.name} value={fileType.name} title={fileType.name} icon={fileType.icon} />;
}
