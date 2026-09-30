import { ElementType, useEffect, useState } from "react";
import { CompileConfig, default_config, get_LocalConfig_prev } from "./util_compile";
import { Form, Toast, showToast } from "@raycast/api";
import fs from "fs";

export function CompilForm(props: {
  FormAction: ElementType;
  show_watchOption: boolean;
  restore_prevConfig: boolean;
  pop_callBack?: () => void;
  prefill_config?: CompileConfig;
  delete_prefill?: boolean;
}) {
  // state declaration
  const [isLoading, set_isLoading] = useState<boolean>(true);
  const [config, set_config] = useState<CompileConfig>(default_config);

  // get last (previous) compiled configuration from LocalStorage
  useEffect(() => {
    if (props.restore_prevConfig) {
      get_LocalConfig_prev()
        .then((_prev_config_) => {
          set_config(_prev_config_);
        })
        .catch(() => {
          set_config(default_config);
        })
        .finally(() => {
          set_isLoading(false);
        });
    } else {
      if (props.prefill_config != undefined) {
        set_config(props.prefill_config);
      } else {
        set_config(default_config);
      }
      set_isLoading(false);
    }
  }, [isLoading]);

  // return react rendering component
  return (
    <Form
      navigationTitle="Compile SCSS to CSS"
      isLoading={isLoading}
      actions={
        <props.FormAction
          config={config}
          set_config={set_config}
          pop_callBack={props.pop_callBack}
          prefill_config={props.prefill_config}
          delete_prefill={props.delete_prefill}
        />
      }
    >
      <Form.Description title="" text={` `} />
      <Form.FilePicker
        id="scssPath"
        title="Source (SCSS)"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={true}
        error={config.scssPath == "" ? "SCSS Path is Required" : undefined}
        value={config.scssPath == "" ? [] : [config.scssPath]}
        onChange={(data) => {
          if (data[0] != undefined) {
            if (!fs.existsSync(data[0]) || fs.lstatSync(data[0]).isDirectory()) {
              if (fs.existsSync(data[0] + "/style.scss")) {
                set_config((conf) => ({ ...conf, scssPath: data[0] + "/style.scss" }));
                // showToast({ title: `📁\tUsing "style.scss" in the directory` });
              } else {
                showToast({ title: `⚠️\tNo "scss file" can be found in the directory`, style: Toast.Style.Failure });
              }
            } else {
              if (data[0].toLowerCase().endsWith(".scss")) {
                set_config((conf) => ({ ...conf, scssPath: data[0] }));
              } else {
                showToast({ title: `⚠️\tPlease select "scss file" or "directory"`, style: Toast.Style.Failure });
              }
            }
          } else {
            set_config((conf) => ({ ...conf, scssPath: "" }));
          }
        }}
        info={`If a directory is chosen for the "source", then the command will by default pick the "style.scss" as source file.`}
      />
      {/* {config.scssPath != "" ? <Form.Description text={config.scssPath} /> : <></>} */}

      <Form.FilePicker
        id="cssPath"
        title="Target (CSS)"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={true}
        error={config.cssPath == "" ? "CSS Path is Required" : undefined}
        value={config.cssPath == "" ? [] : [config.cssPath]}
        onChange={(data) => {
          if (data[0] != undefined) {
            if (!fs.existsSync(data[0]) || fs.lstatSync(data[0]).isDirectory()) {
              set_config((conf) => ({ ...conf, cssPath: data[0] + "/style.css" }));
              // showToast({ title: `📁\tUsing "style.css" in the directory` });
            } else {
              if (data[0].toLowerCase().endsWith(".css")) {
                set_config((conf) => ({ ...conf, cssPath: data[0] }));
              } else {
                showToast({ title: `⚠️\tPlease select "css file" or "directory"`, style: Toast.Style.Failure });
              }
            }
          } else {
            set_config((conf) => ({ ...conf, cssPath: "" }));
          }
        }}
        info={`If a directory is chosen for the "target", then the command will by default pick the "style.css" as the target file`}
      />
      {/* {config.cssPath != "" ? <Form.Description text={config.cssPath} /> : <></>} */}

      {props.show_watchOption ? (
        <Form.Dropdown
          id="watchCompile"
          title="Watch Changes"
          value={config.watchCompile ? "true" : "false"}
          onChange={(data) => {
            set_config((conf) => ({ ...conf, watchCompile: data == "true" }));
          }}
          info={`Tells Sass to monitor for changes and automatically recompile the CSS whenever any modifications are detected.`}
        >
          <Form.Dropdown.Item value="false" title="No-Watch (default)" />
          <Form.Dropdown.Item value="true" title="Watch" />
        </Form.Dropdown>
      ) : (
        <></>
      )}
      <Form.Dropdown
        id="outputStyle"
        title="Output Style"
        value={config.outputStyle}
        onChange={(data) => {
          set_config((conf) => ({ ...conf, outputStyle: data }));
        }}
        info={`Minified Output (CSS) will save a compressed version of CSS file where unnecessary characters (like whitespace, comments, and formatting) are removed to reduce file size.`}
      >
        <Form.Dropdown.Item value="expanded" title="Expanded (default)" />
        <Form.Dropdown.Item value="compressed" title="Compressed" />
      </Form.Dropdown>
      <Form.Dropdown
        id="sourceMap"
        title="Source Map Type"
        value={config.sourceMap}
        onChange={(data) => {
          set_config((conf) => ({ ...conf, sourceMap: data }));
        }}
        info={`A source map is a file that maps from the transformed or compiled version of your code back to the original source files, enabling developers to view and debug their original source code directly in the browser's developer tools, despite the code actually running being minified or compiled.`}
      >
        <Form.Dropdown.Item value="file" title="File" />
        <Form.Dropdown.Item value="inline" title="Inline" />
        <Form.Dropdown.Item value="auto" title="Auto (default)" />
        <Form.Dropdown.Item value="none" title="None" />
      </Form.Dropdown>
    </Form>
  );
}
